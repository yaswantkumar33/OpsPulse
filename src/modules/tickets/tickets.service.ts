import { db } from "../../db";
import { tickets, UserRole, users } from "../../db/schema";
import { ALLOWED_STATUS_TRANSITIONS, createTicketInput, getTicketsQueryInput, updateTicketInput } from "./tickets.schema";
import { eq, and, desc, SQL, count } from "drizzle-orm";
import { AppErr } from "../../shared/errors/app-error";
import { createAuditLog } from "../audit-logs/audit-logs.service";


// types 
interface GetAllTicketParams {
  user: {
    userId: string;
    userRole: UserRole;
  };
  query: getTicketsQueryInput
}
interface updateTicketParams {
  ticketId: string;
  input: updateTicketInput;
  user: {
    userId: string;
    userRole: UserRole;
  };
}



// create ticket 
export const createTicket = async (input: createTicketInput & { customerId: string }) => {
  // 1.need to validate the customer is there or not
  const customerExists = await db.query.users.findFirst({
    where: eq(users.id, input.customerId),
  });

  if (!customerExists)
    throw new AppErr("Customer Not found to create the ticket!");

  // 2.insert the ticket into the ticket table

  const [ticketAdded] = await db.insert(tickets).values(input).returning();
  return ticketAdded;
};

// update ticket 
export const updateTicket = async ({ ticketId, input, user }: updateTicketParams) => {

  const ticketExists = await db.query.tickets.findFirst({
    where: eq(tickets.id, ticketId)
  })

  if (!ticketExists) throw new AppErr("Ticket Not Found!!", 404);

  if (input.status && input.status !== ticketExists.status) {

    const currentStatus = ticketExists.status;
    const allowedNextStatus = ALLOWED_STATUS_TRANSITIONS[currentStatus];

    if (currentStatus == 'closed' && user.userRole !== 'admin') throw new AppErr('Forbidden: Only admins can re open closed tickets', 403);

    if (!allowedNextStatus.includes(input.status)) throw new AppErr(`Invalid status transition from ${currentStatus} to ${input.status}`, 400)
  }

  if (user.userRole === 'agent' && ticketExists.assignedAgentId !== user.userId) throw new AppErr('Forbidden: You can only update tickets that are assigned to you', 403)


  // audit logging 
  const oldValues: Record<string, unknown> = {};
  const newValues: Record<string, unknown> = {};
  let action = 'TICKET UPDATE';

  if (input.status && input.status !== ticketExists.status) {
    action = "STATUS_UPDATE";
    oldValues.status = ticketExists.status;
    newValues.status = input.status;
  }

  if (input.assignedAgentId && input.assignedAgentId !== ticketExists.assignedAgentId) {

    const [assignee] = await db
      .select()
      .from(users)
      .where(eq(users.id, input.assignedAgentId))
      .limit(1);

    if (!assignee) {
      throw new AppErr("Assigned agent not found", 404);
    }

    if (assignee.role === "customer") {
      throw new AppErr("Tickets can only be assigned to agents or admins", 400);
    }

    action = action === 'STATUS_UPDATE' ? 'STATUS_UPDATE_AND_ASSIGNMENT_UPDATE' : 'AGENT_ASSIGNMENT';
    oldValues.assignedAgentId = ticketExists.assignedAgentId;
    newValues.assignedAgentId = input.assignedAgentId;
  }

  if (input.priority && input.priority !== ticketExists.priority) {
    oldValues.priority = ticketExists.priority;
    newValues.priority = input.priority;
  }

  // update query  
  const [updatedTicket] = await db
    .update(tickets)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(tickets.id, ticketId))
    .returning();

  console.log("update ticket service called 5")

  if (Object.keys(newValues).length > 0) {
    await createAuditLog({
      ticketId,
      performedById: user.userId,
      action,
      oldValues,
      newValues
    })
  }
  return updatedTicket;
}

// get All ticket 
export const getAllTicket = async ({ user, query }: GetAllTicketParams) => {

  const { status, priority, page = 1, limit = 10 } = query;
  const offset = (page - 1) * limit;

  let queryConditions: SQL[] = [];

  if (user.userRole === "customer") queryConditions.push(eq(tickets.customerId, user.userId))

  if (status) queryConditions.push(eq(tickets.status, status));

  if (priority) queryConditions.push(eq(tickets.priority, priority));

  const whereClause = queryConditions.length > 0 ? and(...queryConditions) : undefined;

  const [ticketList, totalCountResult] = await Promise.all([
    db.query.tickets.findMany({
      where: whereClause,
      limit: limit,
      offset: offset,
      with: {
        customer: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedAgent: {
          columns: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      orderBy: (tickets, { desc }) => [desc(tickets.createdAt)]
    }),
    db.select({ total: count() }).from(tickets).where(whereClause)
  ])
  const totalCount = totalCountResult[0]?.total || 0;
  const totalPages = Math.ceil(totalCount / limit);

  return { meta: { totalCount, totalPages, currentPage: page, limit, hasNextPage: page < totalPages, hasPreviousPage: page > 1 }, data: ticketList }
};

// get ticket by id 
export const getTicketById = async (ticketId: string, user: { userId: string, userRole: UserRole }) => {

  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.id, ticketId),
    with: {
      customer: {
        columns: { id: true, name: true, email: true }
      },
      assignedAgent: {
        columns: { id: true, name: true, email: true }
      }
    }
  })

  if (!ticket) throw new AppErr("Ticket Not Found!", 404);

  if (user.userRole === 'customer' && ticket.customerId !== user.userId) throw new AppErr("Forbidden: You do not have access to this ticket!", 403)
  return ticket;
}

import { asc, eq } from "drizzle-orm";
import { db } from "../../db";
import { ticketComments, tickets, users } from "../../db/schema";
import { AppErr } from "../../shared/errors/app-error";

interface AuthUser {
    userId: string;
    userRole: "customer" | "agent" | "admin";
}

async function verifyTicketAccess(ticketId: string, user: AuthUser) {
    const [ticket] = await db
        .select()
        .from(tickets)
        .where(eq(tickets.id, ticketId))
        .limit(1);

    if (!ticket) throw new AppErr("Ticket Not Found", 404);

    if (user.userRole === "customer" && ticket.customerId !== user.userId) throw new AppErr("You do not have premission to access this ticket", 403);

    return ticket;
}

export const addCommentToTicket = async (ticketId: string, content: string, user: AuthUser) => {

    await verifyTicketAccess(ticketId, user);

    const [newComment] = await db.insert(ticketComments).values({
        ticketId,
        authorId: user.userId,
        content
    }).returning()

    return newComment;

}

export const getCommentsByTicketId = async (ticketId: string, user: AuthUser) => {


    await verifyTicketAccess(ticketId, user);

    const comments = await db
        .select({
            id: ticketComments.id,
            content: ticketComments.content,
            createdAt: ticketComments.createdAt,
            updatedAt: ticketComments.updatedAt,
            author: { id: users.id, name: users.name, role: users.role },
        })
        .from(ticketComments)
        .innerJoin(users, eq(ticketComments.authorId, users.id))
        .where(eq(ticketComments.ticketId, ticketId))
        .orderBy(asc(ticketComments.createdAt));

    return comments;


}
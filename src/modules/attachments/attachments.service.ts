import { eq } from "drizzle-orm";
import { db } from "../../db";
import { ticketAttachements, tickets, UserRole } from "../../db/schema";
import { AppErr } from "../../shared/errors/app-error";

interface createAttachmentParams {
    ticketId: string;
    uploadedById: string;
    file: Express.Multer.File;
    userRole: UserRole
}

export const createAttachment = async ({ ticketId, uploadedById, file, userRole }: createAttachmentParams) => {

    // verify the ticket exists first
    const ticketExist = await db.query.tickets.findFirst({
        where: eq(tickets.id, ticketId)
    })

    if (!ticketExist) throw new AppErr("Ticket Not Found", 404);

    // scope the users to be customer only attach the file to their own tickets 
    if (userRole === 'customer' && ticketExist.customerId != uploadedById) throw new AppErr('Forbidden: you can only upload attachments to your own tickets', 403);

    // save attachment
    const [attachement] = await db.insert(ticketAttachements).values({
        ticketId,
        uploadedById,
        filename: file.originalname,
        fileUrl: `/uploads/${file.filename}`,
        mimeType: file.mimetype,
        fileSize: file.size
    }).returning()

    return attachement;
}

export const getAttachments = (ticketId: string, userId: string, userRole: UserRole) => {
    const attachments = db.query.ticketAttachements.findFirst({
        where: eq(ticketAttachements.ticketId, ticketId),
        with: {
            uploadedBy: {
                columns: {
                    id: true,
                    name: true,
                    email: true,
                    role: true
                }
            }
        }
    })

    return attachments;
}
import { z } from "zod";

export const commentTicketParamSchema = z.object({
    id: z.uuid("Invalid ticket ID format")
})

export const createCommentSchema = z.object({
    content: z.string({ error: "Comment content is required" }).trim().min(1, "Comment cannot be empty").max(2000, "Comment cannot exceed more than 2000")
})


export type CreateCommentInput = z.infer<typeof createCommentSchema>;
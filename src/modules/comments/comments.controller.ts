import { Request, Response, NextFunction } from "express";
import { commentTicketParamSchema, createCommentSchema } from "./comments.schema";
import * as commentService from "./comments.service";


export const createCommentHandeler = async (req: Request, res: Response, next: NextFunction) => {

    try {
        const { id: ticketId } = commentTicketParamSchema.parse(req.params);
        const { content } = createCommentSchema.parse(req.body)

        const comment = await commentService.addCommentToTicket(ticketId, content, req.user!);

        res.status(201).json({
            success: true,
            data: comment
        });
    } catch (e) { next(e) }

}

export const getTicketCommentsHandeler = async (req: Request, res: Response, next: NextFunction) => {

    try {
        const { id: ticketId } = commentTicketParamSchema.parse(req.params);
        const comments = await commentService.getCommentsByTicketId(ticketId, req.user!);

        res.status(200).json({
            sucess: true,
            data: comments
        })
    } catch (e) { next(e) }

}
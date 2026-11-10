import { NextFunction, Request, Response } from "express";
import { AppErr } from "../../shared/errors/app-error";
import * as attachmentsService from "./attachments.service";

export const uploadAttachmentHandeler = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {

    try {

        const file = req.file;

        if (!file) throw new AppErr('No file  uploaded', 400);

        const { id: ticketId } = req.params;

        const attachment = await attachmentsService.createAttachment({
            ticketId,
            uploadedById: req.user!.userId,
            file: file,
            userRole: req.user!.userRole,
        });



        res.status(201).json({
            success: true,
            message: "Attachment uploaded successfully",
            data: attachment,
        })

    } catch (e) { next(e) }

}

export const getTicketAttachmentsHandeler = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {


    try {

        const { id: ticketId } = req.params;

        const attachments = await attachmentsService.getAttachments(ticketId, req.user!.userId, req.user!.userRole);

        res.status(200).json({
            success: true,
            message: "Attachments retrived successfully",
            data: attachments

        })


    } catch (e) { next(e) }

}
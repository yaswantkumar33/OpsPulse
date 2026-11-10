import { Request, Response, NextFunction } from "express";
import { createTicketSchema, getTicketsQuerySchema, updateTicketSchema } from "./tickets.schema";
import * as ticketService from "./tickets.service";

export const createTicketHandeler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedReqData = createTicketSchema.parse(req.body);
    const customerId = req.user!.userId;
    const ticket = await ticketService.createTicket({ ...validatedReqData, customerId, });
    res.status(201).json({
      success: true,
      message: "Ticket Created Successfully",
      data: ticket,
    });
  } catch (e: any) {
    next(e);
  }
};


export const getTicketsHandeler = async (req: Request, res: Response, next: NextFunction) => {

  try {

    const query = getTicketsQuerySchema.parse(req.query);

    const { meta, data } = await ticketService.getAllTicket({ user: req.user!, query });

    res.status(200).json({
      success: true,
      message: "Tickets retrived successfully",
      data,
      meta
    });

  } catch (e: any) {

    next(e);

  }
};

export const getTicketByIdHandeler = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {

  try {

    const { id } = req.params;

    const ticket = await ticketService.getTicketById(id, req.user!);

    res.status(200).json({
      success: true,
      message: "Ticket details retrieved successfully",
      data: ticket
    })

  } catch (e) { next(e) }

}


export const updateTicketHandeler = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {

  try {
    const { id: ticketId } = req.params;
    const validatedReqData = updateTicketSchema.parse(req.body);
    const updatedTicket = await ticketService.updateTicket({ ticketId, input: validatedReqData, user: req.user! });
    res.status(200).json({
      success: true,
      message: 'Ticket updated successfully',
      data: updatedTicket
    })

  } catch (e) {
    next(e);
  }
}

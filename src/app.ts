import express from "express";
import healthRouter from "./modules/health/health.router";
import userRouter from "./modules/users/users.router";
import ticketRouter from "./modules/tickets/tickets.router";
import authRouter from "./modules/auth/auth.router";
import { errorHandeler } from "./shared/middlewares/error.middleware";

const app = express();

app.use(express.json());

// Routes
app.use("/api", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/tickets", ticketRouter);

// Global Error Handler
app.use(errorHandeler);

export default app;
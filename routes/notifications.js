import express from "express";
import { notificationController } from "../controllers/index.js";

const notificationsRouter = express.Router();


notificationsRouter.post("/mark-read", notificationController.markAllNotificationsAsRead);
notificationsRouter.get("/", notificationController.getAllNotifications);

export { notificationsRouter };

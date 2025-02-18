import express from "express";
import { MessageController } from "../controllers/index.js";
const messRouter = express.Router();

messRouter.post("/", MessageController.addMessage);

messRouter.get("/:chatId", MessageController.getMessages);

export default messRouter;

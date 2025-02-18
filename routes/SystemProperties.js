import express from "express";
import { SystemPropertiesController } from "../controllers/index.js";

const systemRouter = express.Router();

systemRouter.get("/", SystemPropertiesController.getSystemProperties);

export default systemRouter;
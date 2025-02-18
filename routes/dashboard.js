import express from "express";

const dashboardRouter = express.Router();
import {
    getAllData,
} from "../controllers/dashboardController.js";

dashboardRouter.post("/", getAllData);

export { dashboardRouter };

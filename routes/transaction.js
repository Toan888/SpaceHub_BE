import express from "express";

const transactionRouter = express.Router();
import {
    getAllTransaction,
    transactionConfirm,
    transactionCreate,
    adminGetAllTransaction,
    adminConfirmTransaction,
    adminWalletTransaction,
    admiWithdrawTransaction
} from "../controllers/transactionController.js";

transactionRouter.post("/confirm", transactionConfirm);
transactionRouter.post("/create", transactionCreate);
transactionRouter.get("/list", getAllTransaction);
transactionRouter.get("/admin/list", adminGetAllTransaction);
transactionRouter.post("/admin/confirm", adminConfirmTransaction);
transactionRouter.get("/admin/wallet", adminWalletTransaction);
transactionRouter.post("/admin/wallet-withdraw", admiWithdrawTransaction);

export { transactionRouter };

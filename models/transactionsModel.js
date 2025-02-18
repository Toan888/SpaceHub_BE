import mongoose, { Schema } from "mongoose";

const transactionSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    fee: {
      type: Number,
      required: false,
      default: 0
    },
    description: {
      type: String,
      required: true,
    },
    orderId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["Nạp tiền", "Trừ tiền", "Cộng tiền", "Hoàn tiền", "Rút tiền", "Tăng số dư ví admin", "Giảm số dư ví admin"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Khởi tạo", "Thành công", "Thất bại"],
      required: true,
    },
    beneficiaryAccountNumber: {
      type: String,
    },
    beneficiaryBankCode: {
      type: String,
    },
    originalTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "transactions",
    },
    reasonRejected:{
      type: String
    }
  },
  {
    timestamps: true,
  }
);

const TransactionsModel = mongoose.model("transactions", transactionSchema);

export {TransactionsModel};

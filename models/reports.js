import mongoose, { Schema } from "mongoose";

const reportsSchema = new Schema(
  {
    reasonId: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "reasons",
      },
    ],
    customReason: {
      type: String, 
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
    spaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "spaces",
    },
    statusReport: {
      type: String,
      enum: ["Chờ duyệt", "Chấp nhận","Từ chối"],
      default: "Chờ duyệt",
    },
    statusComplaint:{
      type: String,
      enum: ["Chờ duyệt", "Chấp nhận","Từ chối"],
      default: "Chờ duyệt",
    },
    reportRejectionReason:{
      type: String,
    },
    reportRejectionComplaint:{
      type: String,
    },
    complaint:{
      type: String,
      default: "",
    }
  },
  { timestamps: true }
);

const Reports = mongoose.model("reports", reportsSchema);
export default Reports;

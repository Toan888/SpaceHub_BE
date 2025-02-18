import mongoose, { Schema } from "mongoose";

const bookingsSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    spaceId: {
      type: Schema.Types.ObjectId,
      ref: "spaces",
      required: true,
    },
    startDate: {
      // Trước là checkIn
      type: Date,
      required: true,
    },
    endDate: {
      // Trước là checkOut
      type: Date,
      required: true,
    },
    rentalType: {
      // Thêm trường mới để xác định loại hình thuê
      type: String,
      enum: ["hour", "day", "week", "month"],
      required: true,
    },
    selectedSlots: [
      // Để lưu trữ các khung giờ khi thuê theo giờ
      {
        date: { type: Date },
        startTime: { type: String },
        endTime: { type: String },
      },
    ],
    selectedDates: [Date],
    status: {
      type: String,
      enum: ["awaiting payment", "completed", "canceled"],
      default: "awaiting payment",
    },
    items: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "bookingDetails",
      },
    ],
    totalAmount: {
      type: String,
    },
    notes: {
      type: String,
      required: false,
    },
    cancelReason: {
      type: String,
      required: false,
    },
    timeSlot: {
      startTime: { type: String, required: false },
      endTime: { type: String, required: false },
    },
    // ownerApprovalStatus: {
    //   type: String,
    //   enum: ["pending", "accepted", "declined"],
    //   default: "accepted",
    // },
    minusTransId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "transactions",
    },
    plusTransId: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "transactions",
        default: [],
      },
    ],
    refundTransId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "transactions",
    },
    plusStatus: {
      type: String,
      enum: ["pending", "full_plus", "1_plus", "2_plus", "3_plus"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const Bookings = mongoose.model("bookings", bookingsSchema);

export default Bookings;

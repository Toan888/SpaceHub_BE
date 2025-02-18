import mongoose, { Schema } from "mongoose";

const spacesSchema = new Schema(
  {
    locationPoint: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        index: "2dsphere",
      },
    },
    latLng: {
      type: Array(Number),
      required: false,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    location: {
      type: String,
      required: true,
    },
    area: {
      type: String,
      required: true,
    },
    rulesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "rules",
      required: true,
    },

    communityStandardsId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "communityStandards",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    pricePerHour: {
      type: Number,
      // required: true,
    },
    pricePerDay: {
      type: Number,
      // required: true,
    },
    // pricePerWeek: {
    //   type: Number,
    //   // required: true,
    // },
    pricePerMonth: {
      type: Number,
      // required: true,
    },
    images: {
      type: [
        {
          public_id: {
            type: String,
          },
          url: {
            type: String,
            required: true,
          },
        },
      ],
      default: [],
    },
    censorship: {
      type: String,
      enum: ["Chờ duyệt", "Chấp nhận", "Từ chối"],
      default: "Chờ duyệt",
    },
    status: {
      type: String,
      enum: ["Đang sử dụng", "Đang dọn dẹp", "Còn trống"],
      default: "Đang sử dụng",
    },
    categoriesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "categories",
      required: true,
    },
    appliancesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "appliances",
      required: true,
    },
    room: {
      type: String,
    },
    isGoldenHour: { type: Boolean, default: false },
    goldenHourDetails: {
      type: [
        {
          startTime: { type: String },
          endTime: { type: String },
          priceIncrease: { type: Number },
        },
      ],
      default: [],
    },
    reviews: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "reviews",
          require: true,
        },
      ],
      default: [],
    },
    reportCount: {
      type: Number,
      default: 0,
    },
    favorite: {
      type: Boolean,
      default: false,
    },
    isUpdate: {
      type: Boolean,
      default: false,
    },
    detailAddress:{
      type: String,
    }
  },
  {
    timestamps: true,
  }
);

const Spaces = mongoose.model("spaces", spacesSchema);

export default Spaces;

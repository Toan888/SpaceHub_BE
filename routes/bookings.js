import express from "express";
import Bookings from "../models/bookings.js";
import BookingController from "../controllers/bookings.js";
import bookingDetail from "../models/bookingDetails.js";
import Spaces from "../models/spaces.js";
import axios from "axios";
import { mapboxToken } from "../helpers/constants.js";
import { transactionDao } from "../dao/transactionDao.js";
import { notificationDao } from "../dao/index.js";


const bookingRouter = express.Router();

bookingRouter.get

//list danh sách booking
bookingRouter.get("/", async (req, res, next) => {
  try {
    const bookings = await Bookings.find({})
      .populate("spaceId")
      .populate("userId")
      .exec();
    if (bookings.length === 0) {
      res.status(404).json({ message: "Không tìm thấy dịch vụ" });
    }
    res.send(bookings);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error });
  }
});

// Endpoint kiểm tra khung giờ khả dụng
bookingRouter.post('/check-hour-availability', BookingController.checkHourAvailability);
bookingRouter.post('/check-day-availability', BookingController.checkDayAvailability);

// Endpoint để tạo đặt phòng mới
bookingRouter.post('/create', BookingController.createBooking);
bookingRouter.get("/bookingByUserId/:id", BookingController.getListBookingOfUser);
// Hủy lịch
bookingRouter.post("/cancel-booking", BookingController.cancelBooking);
bookingRouter.post("/cancel-booking-precheck", BookingController.cancelBookingPrecheck);


// Cập nhật trạng thái booking và lý do nếu chuyển thành 'cancel' api cho user
bookingRouter.put("/update-status/:id", async (req, res, next) => {
  try {
    const { status, cancelReason } = req.body; // Ensure the naming is consistent with the schema
    if (status !== "completed" && status !== "canceled") {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const updatedBooking = await Bookings.findByIdAndUpdate(
      req.params.id,
      { status, cancelReason: status === "canceled" ? cancelReason : undefined }, // Cập nhật cancelReason chỉ khi status là "canceled"
      { new: true }
    ).populate("userId")
    .populate("spaceId");;

    if (!updatedBooking) {
      return res.status(404).json({ message: "Không tìm thấy booking" });
    }
    // Nếu trạng thái là "completed", gửi email

    if (status === "completed") {
      await transactionDao.transferMoneyBooking(updatedBooking.userId._id.toString(), "Hoàn tiền", "Thành công", updatedBooking.totalAmount, `Hoàn tiền ${updatedBooking.spaceId.name}`)
      // const tenantEmail = updatedBooking.userId.gmail; // Giả sử bạn có trường email trong user
      // console.log(tenantEmail);

      // await sendEmailBookingCompleted.sendEmailBookingCompleted(tenantEmail, updatedBooking);
    }

    res.status(200).json(updatedBooking);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error });
  }
});


// api lấy 3 spaces có lượt book nhiều nhất theo quantity
bookingRouter.get("/top-spaces", async (req, res) => {
  try {
    const result = await bookingDetail.aggregate([
      {
        //Gom nhóm các order item theo productId và tính tổng số lượng của từng sp
        $group: {
          _id: "$spaceId",
          quantity: { $sum: "$quantity" },
          latestCreatedAt: { $max: "$createdAt" },
        },
      },
      // {
      //   $match: { quantity: { $gt: 0 } }, // Lọc sản phẩm có quantity > 0
      // },
      {
        $sort: { quantity: -1, latestCreatedAt: -1 },
      },
      {
        $limit: 3,
      },
    ]);

    if (result.length === 0) {
      return res.status(404).json({ message: "No space found" });
    }

    // Lấy thông tin chi tiết của các sản phẩm bán chạy nhất
    const topSpaces = await Spaces.find({
      _id: { $in: result.map((item) => item._id) },
    });

    // Gộp thông tin chi tiết với số lượng sản phẩm đã bán
    const topSpaceWithQuantity = topSpaces.map((s) => {
      const quantitySold = result.find((item) =>
        item._id.equals(s._id)
      ).quantity;
      // const totalPrice = s.price * quantitySold;
      return {
        // trả về đối tượng js với các thuộc tính của sp như id, name, price ...
        ...s.toObject(),
        quantity: quantitySold,
        // totalPrice: totalPrice,
      };
    });

    // sắp xếp địa điểm nhiều nhất lên đầu
    topSpaceWithQuantity.sort((a, b) => b.quantity - a.quantity);

    return res.status(200).json(topSpaceWithQuantity);
  } catch (error) {
    console.log(error.message);
    return res
      .status(500)
      .json({ message: "Error retrieving the top products" });
  }
});


bookingRouter.get("/near-spaces", async (req, res) => {
  try {
    const {lat, lng} = req.query;
    let result = []
    if (lat && lng) {
      result = await Spaces.find({
        locationPoint: {
              $near: {
                  $geometry: {
                      type: "Point",
                      coordinates: [lng, lat]
                  }
              }
          }
      })
      .limit(3);
    } else {
      result = await Spaces.find()
        .sort({ updatedAt: -1 }) 
        .limit(3);
    }

    if (result.length === 0) {
      return res.status(200).json([]);
    }
    let resData = []
      for (let i = 0; i < result.length; i++) {
        resData.push({_id: result[i]._id, images: result[i].images, name: result[i].name, location: result[i].location, pricePerHour: result[i].pricePerHour})
        try {      
        const res = await axios.get(`https://api.mapbox.com/directions/v5/mapbox/driving/${lng},${lat};${result[i].locationPoint.coordinates[0]},${result[i].locationPoint.coordinates[1]}`, {
          params: {
            access_token: mapboxToken
          }
        })
        if (res?.data?.routes && res.data.routes.length > 0 && res.data.routes[0].distance) {
          resData[i].distance = res.data.routes[0].distance >= 1000 ? `${Math.floor(res.data.routes[0].distance/1000)}km` : `${res.data.routes[0].distance}m`;
        }
      } catch (error) {
        console.log(error.message);
      }
      }
    return res.status(200).json(resData);
  } catch (error) {
    console.log(error.message);
    return res
      .status(500)
      .json({ message: "Error retrieving the top products" });
  }
});


//Duyệt booking của người dùng muốn thuê...
bookingRouter.put("/updateBookStatus/:id", async (req, res, next) => {
  try {
    const { ownerApprovalStatus, cancelReason } = req.body;

    // Validate the ownerApprovalStatus value
    if (!["pending", "accepted", "declined"].includes(ownerApprovalStatus)) {
      return res.status(400).json({ message: "Invalid owner approval status" });
    }

    // Prepare the update data
    const updateData = {
      ownerApprovalStatus,
    };

    // If the status is declined, add the cancelReason
    if (ownerApprovalStatus === "declined") {
      updateData.cancelReason = cancelReason;
    }

    const updatedBooking = await Bookings.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    )
      .populate("userId")
      .populate("spaceId");

    if (!updatedBooking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.json(updatedBooking);
  } catch (error) {
    next(error);
  }
});

// lấy các đơn book của người cho thuê
bookingRouter.get("/spaces/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const bookings = await Bookings.find({})
      .populate("spaceId")
      .populate("userId")
      .exec();
    const filteredBookings = bookings.filter(
      (booking) => booking?.spaceId?.userId?.toString() === userId
    );
    if (filteredBookings.length === 0) {
      return res
        .status(404)
        .json({ message: "No bookings found for this user in their spaces" });
    }
    res.json(filteredBookings);
  } catch (error) {
    next(error);
  }
});

bookingRouter.put("/updatestatus/:id", async (req, res, next) => {
  try {
    const { ownerApprovalStatus, reasonOwnerRejected } = req.body;
    // Validate the ownerApprovalStatus value
    if (!["pending", "accepted", "declined"].includes(ownerApprovalStatus)) {
      return res.status(400).json({ message: "Invalid owner approval status" });
    }
    // Prepare the update data
    const updateData = {
      ownerApprovalStatus,
    };
    // If the status is declined, add the cancelReason
    if (ownerApprovalStatus === "declined") {
      updateData.reasonOwnerRejected = reasonOwnerRejected;
    }
    const updatedBooking = await Bookings.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    )
    .populate({path: "userId", select: "fullname avatar"})     
    .populate("spaceId");
    if (!updatedBooking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    
    let notificationMessage = "";
    if (ownerApprovalStatus === "accepted") {
      notificationMessage = "Lịch book của bạn đã được chấp nhận";
    } else if (ownerApprovalStatus === "declined") {
      notificationMessage = "Lịch book của bạn đã bị từ chối";
    }

    await notificationDao.saveAndSendNotification(
      updatedBooking.userId._id.toString(),
      notificationMessage,
      updatedBooking.userId.avatar,
      "/history"
    );
    res.json(updatedBooking);
  } catch (error) {
    next(error);
  }
});

export default bookingRouter  
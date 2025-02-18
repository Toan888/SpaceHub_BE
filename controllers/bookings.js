import nodemailer from "nodemailer";
import BookingDAO from "../dao/Booking.js";
import Bookings from "../models/bookings.js";
import bookingDetail from "../models/bookingDetails.js";
import { notificationDao } from "../dao/index.js";
import Spaces from "../models/spaces.js";
import Users from "../models/users.js";
import { transactionDao } from "../dao/transactionDao.js";

const sendEmailBookingCompleted = async (tenantEmail, bookingDetails) => {
  const transporter = nodemailer.createTransport({
    service: "Gmail", // Hoặc dịch vụ email bạn sử dụng
    auth: {
      user: "toan20022222@gmail.com", // Địa chỉ email của bạn
      pass: "umpw zlcp eujr njwp", // Mật khẩu email
    },
  });

  const mailOptions = {
    from: "toan20022222@gmail.com",
    to: tenantEmail,
    subject: 'Booking Confirmation',
    text: `Your booking is confirmed! Details: ${JSON.stringify(bookingDetails)}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully!");
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

export const createBooking = async (req, res) => {
  try {
    const { userId, spaceId, rentalType, startDate, endDate, selectedSlots, selectedDates, status, notes, totalAmount } = req.body;

    const user = await Users.findById(userId);
    // Kiểm tra các trường dữ liệu trước khi lưu
    if (Number(totalAmount) > user.balanceAmount) {
      return res.status(400).json({ message: "Số dư không đủ để thực hiện giao dịch" });
    }

    // Kiểm tra xung đột trước khi tạo đặt phòng mới
    let conflictExists = false;

    if (rentalType === "hour") {
      // Kiểm tra xung đột cho từng slot trong ngày
      const conflictingBookings = await Bookings.find({
        spaceId,
        "selectedSlots.date": { $in: selectedSlots.map((slot) => slot.date) },
        "selectedSlots.startTime": {
          $in: selectedSlots.map((slot) => slot.startTime),
        },
        "selectedSlots.endTime": {
          $in: selectedSlots.map((slot) => slot.endTime),
        },
      });

      conflictExists = conflictingBookings.length > 0;
    } else {
      // Kiểm tra xung đột cho từng ngày
      const conflictingBookings = await Bookings.find({
        spaceId,
        selectedDates: { $in: selectedDates }
      });

      conflictExists = conflictingBookings.length > 0;
    }

    if (conflictExists) {
      return res.status(409).json({ message: "Lịch đã có người đặt trước đó!" });
    }

    // Kiểm tra xem bookingDetail cho spaceId đã tồn tại chưa
    let bookingDetailEntry = await bookingDetail.findOne({ spaceId });

    if (bookingDetailEntry) {
      // Nếu tồn tại, tăng `quantity` và cập nhật `totalAmount`
      bookingDetailEntry.quantity += 1;
      bookingDetailEntry.totalAmount += totalAmount;
      await bookingDetailEntry.save();
    } else {
      // Nếu chưa tồn tại, tạo mới `bookingDetailEntry`
      bookingDetailEntry = new bookingDetail({
        spaceId,
        quantity: 1,
        totalAmount: totalAmount

      });
      await bookingDetailEntry.save();
    }

    const space = await Spaces.findById(spaceId);

    const minusTransactionData = await transactionDao.transferMoneyBooking(userId, "Trừ tiền", "Thành công", totalAmount, `Thanh toán ${space.name}`)

    // Tạo đối tượng đặt phòng mới
    const newBooking = new Bookings({
      userId,
      spaceId,
      rentalType,
      startDate,
      endDate,
      selectedSlots,
      selectedDates,
      status: "completed",
      notes,
      items: [bookingDetailEntry._id],
      totalAmount,
      minusTransId: minusTransactionData.transaction._id.toString()
    });

    await newBooking.save();
    const userAvatar = user?.avatar || "https://cellphones.com.vn/sforum/wp-content/uploads/2023/10/avatar-trang-4.jpg";

    await notificationDao.saveAndSendNotification(
      space.userId.toString(),
      `${user.fullname} đã booking ${space.name}`,
      userAvatar,
      `/order`
        );
    res
      .status(201)
      .json({ message: "Booking created successfully", newBooking });
  } catch (error) {
    console.error("Error creating booking:", error);
    res
      .status(500)
      .json({ message: `Error creating booking: ${error.message}` });
  }
};


// const checkHourAvailability = async (req, res) => {
//   try {
//     const { spaceId, dates, rentalType } = req.body;
//     const parsedDates = dates.map((date) => {
//       const parsedDate = new Date(date);
//       if (isNaN(parsedDate)) {
//         throw new Error(`Invalid date format: ${date}`);
//       }
//       return parsedDate;
//     })

//     // Lấy tất cả các booking trùng với các ngày đã chọn
//     const bookings = await BookingDAO.getBookingsBySpaceAndDates(
//       spaceId,
//       parsedDates,
//       rentalType
//     );
//     if (rentalType === "day" && bookings.length > 0) {
//       return res.status(200).json({
//         isAvailable: false,
//         takenDates: bookings
//           .flatMap((booking) => booking.selectedDates)
//           .filter((selectedDate) => {
//             const selectedDateString = selectedDate.toISOString();
//             const datePart = selectedDateString.split("T")[0];
//             const onylDateParts = dates.map((date) => date.split("T")[0]);
//             return onylDateParts.includes(datePart);
//           }),
//       });
//     }
//     // Lưu trữ các slot đã được đặt
//     const bookedSlots = bookings.reduce((acc, booking) => {
//       if (booking.rentalType !== "hour") {
//         booking.selectedDates.forEach((selectedDate) => {
//           const dateKey = new Date(selectedDate).toDateString();
//           acc[dateKey] = -1; // cả ngày
//         });
//       } else {
//         booking.selectedSlots.forEach((slot) => {
//           const dateKey = new Date(slot.date).toDateString();
//           if (!acc[dateKey]) {
//             acc[dateKey] = [];
//           }
//           acc[dateKey].push(`${slot.startTime}-${slot.endTime}`);
//         });
//       }
//       return acc;
//     }, {});

//     // Giả định rằng hệ thống có các khung giờ từ 00:00 đến 24:00
//     const allSlots = [
//       { startTime: "00:00", endTime: "01:00" },
//       { startTime: "01:00", endTime: "02:00" },
//       { startTime: "02:00", endTime: "03:00" },
//       { startTime: "03:00", endTime: "04:00" },
//       { startTime: "04:00", endTime: "05:00" },
//       { startTime: "05:00", endTime: "06:00" },
//       { startTime: "06:00", endTime: "07:00" },
//       { startTime: "07:00", endTime: "08:00" },
//       { startTime: "08:00", endTime: "09:00" },
//       { startTime: "09:00", endTime: "10:00" },
//       { startTime: "10:00", endTime: "11:00" },
//       { startTime: "11:00", endTime: "12:00" },
//       { startTime: "12:00", endTime: "13:00" },
//       { startTime: "13:00", endTime: "14:00" },
//       { startTime: "14:00", endTime: "15:00" },
//       { startTime: "15:00", endTime: "16:00" },
//       { startTime: "16:00", endTime: "17:00" },
//       { startTime: "17:00", endTime: "18:00" },
//       { startTime: "18:00", endTime: "19:00" },
//       { startTime: "19:00", endTime: "20:00" },
//       { startTime: "20:00", endTime: "21:00" },
//       { startTime: "21:00", endTime: "22:00" },
//       { startTime: "22:00", endTime: "23:00" },
//       { startTime: "23:00", endTime: "00:00" },
//     ];

//     const availableSlots = parsedDates.map((date) => {
//       const dateKey = date.toDateString();
//       if (bookedSlots[dateKey] === -1) {
//         return { date: dateKey, isAvailable: false };
//       }
//       const slotsForDay = bookedSlots[dateKey] || [];
//       const slotsAvailable = allSlots.filter((slot) => {
//         const slotKey = `${slot.startTime}-${slot.endTime}`;
//         return !slotsForDay.includes(slotKey);
//       });

//       return {
//         date: dateKey,
//         slots: slotsAvailable,
//         isAvailable: slotsAvailable.length > 0, // Ngày khả dụng nếu có slot nào trống
//       };
//     });
//     res.status(200).json({ availableSlots });
//   } catch (error) {
//     console.error("Error checking hour availability:", error);
//     res
//       .status(500)
//       .json({ message: `Error checking hour availability: ${error.message}` });
//   }
// };

const checkHourAvailability = async (req, res) => {
  try {
    const { spaceId, dates, rentalType } = req.body;

    // Chuyển đổi và kiểm tra định dạng ngày
    const parsedDates = dates.map((date) => {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate)) {
        throw new Error(`Invalid date format: ${date}`);
      }
      return parsedDate;
    });

    // Lấy tất cả các booking trùng với các ngày đã chọn
    const bookings = await BookingDAO.getBookingsBySpaceAndDates(
      spaceId,
      parsedDates,
      rentalType
    );

    if (rentalType === "day" && bookings.length > 0) {
      const takenDates = bookings
        .flatMap((booking) => booking.selectedDates)
        .filter((selectedDate) => {
          if (!selectedDate) {
            console.error("Invalid selectedDate:", selectedDate);
            return false;
          }
          const parsedDate = new Date(selectedDate);
          if (isNaN(parsedDate)) {
            console.error("Invalid date format in bookings:", selectedDate);
            return false;
          }
          const selectedDateString = parsedDate.toISOString();
          const datePart = selectedDateString.split("T")[0];
          const onlyDateParts = dates.map((date) => date.split("T")[0]);
          return onlyDateParts.includes(datePart);
        });

      return res.status(200).json({
        isAvailable: false,
        takenDates,
      });
    }

    // Lưu trữ các slot đã được đặt
    const bookedSlots = bookings.reduce((acc, booking) => {
      if (booking.rentalType !== "hour") {
        booking.selectedDates.forEach((selectedDate) => {
          const dateKey = new Date(selectedDate).toDateString();
          acc[dateKey] = -1; // Cả ngày đã được đặt
        });
      } else {
        booking.selectedSlots.forEach((slot) => {
          const dateKey = new Date(slot.date).toDateString();
          if (!acc[dateKey]) {
            acc[dateKey] = [];
          }
          acc[dateKey].push(`${slot.startTime}-${slot.endTime}`);
        });
      }
      return acc;
    }, {});

    // Giả định rằng hệ thống có các khung giờ từ 00:00 đến 24:00
    const allSlots = [
      { startTime: "00:00", endTime: "01:00" },
      { startTime: "01:00", endTime: "02:00" },
      { startTime: "02:00", endTime: "03:00" },
      { startTime: "03:00", endTime: "04:00" },
      { startTime: "04:00", endTime: "05:00" },
      { startTime: "05:00", endTime: "06:00" },
      { startTime: "06:00", endTime: "07:00" },
      { startTime: "07:00", endTime: "08:00" },
      { startTime: "08:00", endTime: "09:00" },
      { startTime: "09:00", endTime: "10:00" },
      { startTime: "10:00", endTime: "11:00" },
      { startTime: "11:00", endTime: "12:00" },
      { startTime: "12:00", endTime: "13:00" },
      { startTime: "13:00", endTime: "14:00" },
      { startTime: "14:00", endTime: "15:00" },
      { startTime: "15:00", endTime: "16:00" },
      { startTime: "16:00", endTime: "17:00" },
      { startTime: "17:00", endTime: "18:00" },
      { startTime: "18:00", endTime: "19:00" },
      { startTime: "19:00", endTime: "20:00" },
      { startTime: "20:00", endTime: "21:00" },
      { startTime: "21:00", endTime: "22:00" },
      { startTime: "22:00", endTime: "23:00" },
      { startTime: "23:00", endTime: "00:00" },
    ];

    const availableSlots = parsedDates.map((date) => {
      const dateKey = date.toDateString();
      if (bookedSlots[dateKey] === -1) {
        return { date: dateKey, isAvailable: false,slots: [] };
      }
      const slotsForDay = bookedSlots[dateKey] || [];
      const slotsAvailable = allSlots.filter((slot) => {
        const slotKey = `${slot.startTime}-${slot.endTime}`;
        return !slotsForDay.includes(slotKey);
      });

      return {
        date: dateKey,
        slots: slotsAvailable,
        isAvailable: slotsAvailable.length > 0, // Ngày khả dụng nếu có slot nào trống
      };
    });

    res.status(200).json({ availableSlots });
  } catch (error) {
    res
      .status(500)
      .json({ message: `Error checking hour availability: ${error.message}` });
  }
};


const checkDayAvailability = async (req, res) => {
  try {
    const { spaceId, dates } = req.body;
    const parsedDates = dates.map((date) => {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate)) {
        throw new Error(`Invalid date format: ${date}`);
      }
      return parsedDate;
    });

    // Lấy tất cả các booking trùng với các ngày đã chọn
    const bookings = await BookingDAO.getBookingsBySpaceAndDates(
      spaceId,
      parsedDates,
      "day"
    );

    // Lưu trữ các slot đã được đặt theo ngày
    const bookedDays = bookings.reduce((acc, booking) => {
      booking.selectedSlots.forEach((slot) => {
        const dateKey = new Date(slot.date).toDateString();
        acc[dateKey] = true; // Đánh dấu ngày đó đã có slot đặt
      });
      return acc;
    }, {});

    
    // Đánh dấu ngày nào có bất kỳ slot đã đặt
    const availableSlots = parsedDates.map((date) => {
      const dateKey = date.toDateString();
      return {
        date: dateKey,
        isAvailable: !bookedDays[dateKey], // Ngày khả dụng nếu không có slot nào đã đặt
      };
    });

    res.status(200).json({ availableSlots });
  } catch (error) {
    // console.error("Error checking day availability:", error);
    res
      .status(500)
      .json({ message: `Error checking day availability: ${error.message}` });
  }
};

const getListBookingOfUser = async (req, res) => {
  try {
    const bookingByUserId = req.params.id;
    const bookList = await BookingDAO.fetchListBookingOfUser(bookingByUserId);
    if (bookList && bookList.length > 0) {
      res.status(200).json(bookList);
    } else {
      res.status(404).json("Not Found");
    }
  } catch (error) {
    res.status(500).json({ message: `Error: ${error.message}` });
  }
};
const cancelBooking = async (req, res) => {
  try {
    const { userId, bookingId, cancelReason } = req.body;   
    await BookingDAO.cancelBooking(userId, bookingId,cancelReason);
    res.status(200).json({ message: "Hủy đặt space thành công" });
  } catch (error) {
    res.status(400).json({ message: error.message });
    return;
  }
};

const cancelBookingPrecheck = async (req, res) => {
  try {
    const {userId, bookingId} = req.body    
    const data = await BookingDAO.cancelBookingPrecheck(userId, bookingId);
    res.status(200).json({ ...data });
  } catch (error) {
    res.status(400).json({ message: error.message });
    return;
  }
};
const BookingController = {
  sendEmailBookingCompleted,
  createBooking,
  checkHourAvailability,
  checkDayAvailability,
  getListBookingOfUser,
  cancelBooking,
  cancelBookingPrecheck
}

export default BookingController
import Booking from "../models/bookings.js";
import dayjs from 'dayjs';
import { transactionDao } from "./transactionDao.js";
import { notificationDao } from "./index.js";
import Users from "../models/users.js";

class BookingDAO {
  static async getBookingsBySpaceAndDates(spaceId, dates, rentalType) {
    try {
      const bookings = [];

      for (const date of dates) {
        const parsedDate = new Date(date);
        if (isNaN(parsedDate)) {
          throw new Error(`Invalid date format: ${date}`);
        }

        const startOfDay = new Date(parsedDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(parsedDate);
        endOfDay.setHours(23, 59, 59, 999);

        let dayBookings;

        // Phân biệt logic dựa trên rentalType
        if (rentalType === "hour") {
          // Với loại thuê theo giờ hoặc ngày, kiểm tra từng slot cụ thể trong ngày
          dayBookings = await Booking.find({
            spaceId,
            selectedDates: {
              $elemMatch: {
                $gte: startOfDay,
                $lte: endOfDay,
              },
            },
            rentalType: { $ne: "hour" },
          });
        } else if (rentalType === "day") {
          // Với loại thuê theo giờ hoặc ngày, kiểm tra từng slot cụ thể trong ngày
          dayBookings = await Booking.find({
            spaceId,
            selectedDates: {
              $elemMatch: {
                $gte: startOfDay,
                $lte: endOfDay,
              },
            },
          });
        } else if (rentalType === "week" || rentalType === "month") {
          // Với loại thuê theo tuần hoặc tháng, kiểm tra khoảng thời gian từ startDate đến endDate
          dayBookings = await Booking.find({
            spaceId,
            startDate: { $lte: endOfDay },
            endDate: { $gte: startOfDay },
          });
        }

        bookings.push(...dayBookings);
      }

      return bookings;
    } catch (error) {
      throw new Error(
        "Error fetching bookings by space and date: " + error.message
      );
    }
  }

  static async getBookingsByUser(userId) {
    try {
      return await Booking.find({ userId });
    } catch (error) {
      throw new Error("Error retrieving bookings: " + error.message);
    }
  }

  // Các phương thức DAO khác có thể thêm vào đây, ví dụ: cập nhật, xoá booking

  static async fetchListBookingOfUser(id) {
    try {
      const orders = await Booking.find({ userId: id })
        .populate({
          path: "items",
          populate: {
            path: "spaceId",
            model: "spaces",
          },
        })
        .lean()
        .exec();

      const response = [];
      if (orders && orders.length > 0) {
        orders.forEach((order) =>
          response.push({ ...order, isAllowCancel: this.isAllowCancel(order) })
        );
      }

      return response;
    } catch (error) {
      throw new Error(error.toString());
    }
  }

  static async cancelBooking(userId, bookingId, cancelReason) {
    try {
      console.log(userId, bookingId)
      const booking = await Booking.findById(bookingId).populate("spaceId");
      if (!booking) throw new Error("notfound");

      if (!this.isAllowCancel(booking)) {
        throw new Error("Không được phép hủy")
      }

      let amount = 0;

      if (booking.rentalType === 'hour' || booking.rentalType === 'day') {
        amount = booking.totalAmount;
      }

      if (booking.rentalType === 'month') {
        if (dayjs(booking.startDate).isAfter(dayjs().add(7, 'day')) || dayjs(booking.startDate).isSame(dayjs().add(7, 'day'))) {
          // trc 7 ngay
          amount = booking.totalAmount;
        } else if (dayjs(booking.startDate).isAfter(dayjs())) {
          // trc 1 - 7 ngay
          amount = booking.totalAmount * 80 / 100;
        } else if (dayjs(booking.startDate).isAfter(dayjs().subtract(7)) || dayjs(booking.startDate).isSame(dayjs().subtract(7))) {
          // tuan 1
          amount = booking.totalAmount * 60 / 100;
        } else {
          amount = booking.totalAmount * 30 / 100;
        }
      }
      
      
      const { transaction } = await transactionDao.transferMoneyBooking(
        booking.userId,
        "Hoàn tiền",
        "Thành công",
        amount,
        `Hoàn tiền thuê không gian ${booking.spaceId.name}`
      );
      
      await Booking.updateOne(
        { _id: bookingId },  // The condition to find the document by ID
        {
          $set: {
            status: 'canceled',
            endDate: new Date(),
            refundTransId: transaction,
            cancelReason: cancelReason
          }
        }
      );
      
      const user = await Users.findById(userId);
      await notificationDao.saveAndSendNotification(
        booking.spaceId.userId.toString(),
        `${user?.fullname} đã hủy đặt space ${booking.spaceId?.name}`,
        booking.spaceId.images && booking.spaceId.images.length > 0 ? booking.spaceId.images[0].url : null
      );

    } catch (error) {
      throw new Error(error);
    }
  }

  static async cancelBookingPrecheck(userId, bookingId) {
    try {
      console.log(userId, bookingId)
      const booking = await Booking.findById(bookingId).populate("spaceId");
      if (!booking) 
        return {isAllowCancel: false}

      if (!this.isAllowCancel(booking)) {
        return {isAllowCancel: false}
      }

      let amount = 0;

      if (booking.rentalType === 'hour') {
        const smallestSlot = booking.selectedSlots.reduce((smallest, current) => {
            return !smallest || current.startTime < smallest.startTime
                ? current
                : smallest;
        }, null);

        const firstTimeBook = dayjs(
            dayjs(booking.startDate).format("YYYY-MM-DD") +
            " " +
            smallestSlot.startTime
        );

        if (firstTimeBook.isAfter(dayjs().add(5, "hour"))) {
            amount = booking.totalAmount;
        } else {
            return { isAllowCancel: false };
        }
    }

    if (booking.rentalType === 'day') {
        amount = booking.totalAmount;
    }
      if (booking.rentalType === 'month') {
        if (dayjs(booking.startDate).isAfter(dayjs().add(7, 'day')) || dayjs(booking.startDate).isSame(dayjs().add(7, 'day'))) {
          // trc 7 ngay
          amount = booking.totalAmount;
        } else if (dayjs(booking.startDate).isAfter(dayjs())) {
          // trc 1 - 7 ngay
          amount = booking.totalAmount * 80 / 100;
        } else if (dayjs(booking.startDate).isAfter(dayjs().subtract(7)) || dayjs(booking.startDate).isSame(dayjs().subtract(7))) {
          // tuan 1
          amount = booking.totalAmount * 60 / 100;
        } else {
          amount = booking.totalAmount * 30 / 100;
        }
      }
      
      return {isAllowCancel: true, amount}

    } catch (error) {
      throw new Error(error);
    }
  }

  static isAllowCancel(booking) {
    if (booking.status === "canceled") {
      return false;
    }
    const currentDate = dayjs();
    if (booking.rentalType === "hour") {
      const smallestSlot = booking.selectedSlots.reduce((smallest, current) => {
          return !smallest || current.startTime < smallest.startTime
              ? current
              : smallest;
      }, null);

      const firstTimeBook = dayjs(
          dayjs(booking.startDate).format("YYYY-MM-DD") +
          " " +
          smallestSlot.startTime
      );
      if (firstTimeBook.isAfter(currentDate.add(5, "hour"))) {
          return true;
      }
  }
    if (booking.rentalType === "day") {
      if (dayjs(booking.startDate).isAfter(currentDate.add(1, "day"))  || dayjs(booking.startDate).isSame(currentDate.add(1, "day"))) {
        return true;
      }
    }
    if (booking.rentalType === "month") {
      if (dayjs(booking.startDate).isAfter(currentDate.subtract(14, "day")) || dayjs(booking.startDate).isSame(currentDate.subtract(14, "day"))) {
        return true;
      }
    }
    return false;
  }
}




export default BookingDAO;

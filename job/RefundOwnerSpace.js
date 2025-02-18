import Bookings from "../models/bookings.js";
import { transactionDao } from "../dao/transactionDao.js";
import { notificationDao } from "../dao/index.js"; 

// Trả chủ space giờ 
async function plusHour() {
  try {
    const currentTime = new Date();
    const currentTimeStr = currentTime.toISOString().slice(11, 16);
    const bookingProcessList = await Bookings.find({
      // ownerApprovalStatus: "accepted",
      status: "completed",
      rentalType: "hour",
      plusStatus: { $ne: "full_plus" },
      // $expr: {
      //   $and: [
      //     { $lt: ["$endDate", currentTime] }, 
      //     {
      //       $lt: [
      //         {
      //           $let: {
      //             vars: {
      //               latestEndTime: {
      //                 $max: {
      //                   $map: {
      //                     input: "$selectedSlot",
      //                     as: "slot",
      //                     in: "$$slot.endTime",
      //                   },
      //                 },
      //               },
      //             },
      //             in: "$$latestEndTime",
      //           },
      //         },
      //         currentTimeStr,
      //       ],
      //     },
      //   ],
      // },
    })


      .populate({
            path: 'spaceId', // Populate không gian
            populate:
                {
                    path: 'userId', // Populate userId của không gian
                    select: 'fullname', // Lấy chỉ trường fullname của người dùng
                }
        })
      .populate("refundTransId");
      console.log(bookingProcessList)
    bookingProcessList.forEach(async (bookingProcess) => {
      let amount = Number(bookingProcess.totalAmount);
      amount =
        Number(amount) -
        (bookingProcess.refundTransId
          ? Number(bookingProcess.refundTransId.amount)
          : 0);
      if (amount > 0) {
        const { transaction } = await transactionDao.transferMoneyBooking(
          bookingProcess.spaceId.userId,
          "Cộng tiền",
          "Thành công",
          amount,
          `Tiền cho thuê không gian ${bookingProcess.spaceId.name}`
        );

        await Bookings.updateOne(
          { _id: bookingProcess._id.toString() },
          {
            $push: { plusTransId: transaction._id.toString() },
            plusStatus: "full_plus",
          }
        );
      } else {
        await Bookings.updateOne(
          { _id: bookingProcess._id.toString() },
          { plusStatus: "full_plus" }
        );
      }

      await notificationDao.saveAndSendNotification(
        bookingProcess.spaceId.userId._id.toString(),
        `Số tiền đặt không gian ${bookingProcess.spaceId.name} đã được trả về ví.`,
        bookingProcess.spaceId?.images?.[0].url,
        "/addfund"
      );


    });
  } catch (error) {
    console.error("Error plus money", error);
  }
}

// Trả chủ space ngày 
async function plusDay() {
  try {
    const bookingProcessList = await Bookings.find({
      // ownerApprovalStatus: "accepted",
      status: "completed",
      // endDate: { $lt: new Date() },
      rentalType: "day",
      plusStatus: { $ne: "full_plus" },
    })
      .populate({
        path: "spaceId", // Populate không gian
        populate: {
          path: "userId", // Populate userId của không gian
          select: "fullname", // Lấy chỉ trường fullname của người dùng
        },
      })
      .populate("refundTransId");
    bookingProcessList.forEach(async (bookingProcess) => {
      let amount = Number(bookingProcess.totalAmount);
      amount =
        Number(amount) -
        (bookingProcess.refundTransId
          ? Number(bookingProcess.refundTransId.amount)
          : 0);
      if (amount > 0) {
        const { transaction } = await transactionDao.transferMoneyBooking(
          bookingProcess.spaceId.userId,
          "Cộng tiền",
          "Thành công",
          amount,
          `Tiền cho thuê không gian ${bookingProcess.spaceId.name}`
        );

        await Bookings.updateOne(
          { _id: bookingProcess._id.toString() },
          {
            $push: { plusTransId: transaction._id.toString() },
            plusStatus: "full_plus",
          }
        );
      } else {
        await Bookings.updateOne(
          { _id: bookingProcess._id.toString() },
          { plusStatus: "full_plus" }
        );
      }
      await notificationDao.saveAndSendNotification(
        bookingProcess.spaceId.userId._id.toString(),
        `Số tiền đặt không gian ${bookingProcess.spaceId.name} đã được trả về ví.`,
        bookingProcess.spaceId?.images?.[0].url,
        "/addfund"
      );
    });
  } catch (error) {
    console.error("Error plus money", error);
  }
}

// Trả chủ space tuần
async function plusWeek() {
  try {
    const bookingProcessList = await Bookings.find({
      // ownerApprovalStatus: "accepted",
      status: "completed",
      endDate: { $lt: new Date() },
      rentalType: "week",
      plusStatus: { $ne: "full_plus" }
    })
      .populate("spaceId")
      .populate("refundTransId");
    bookingProcessList.forEach(async (bookingProcess) => {
      let amount = Number(bookingProcess.totalAmount);
      amount = Number(amount) - (bookingProcess.refundTransId ? Number(bookingProcess.refundTransId.amount) : 0);
      if (amount > 0) {
        const {transaction} = await transactionDao.transferMoneyBooking(
          bookingProcess.spaceId.userId,
          "Cộng tiền",
          "Thành công",
          amount,
          `Tiền cho thuê không gian ${bookingProcess.spaceId.name}`
        );
        await Bookings.updateOne(
          { _id: bookingProcess._id.toString() },
          {
            $push: { plusTransId: transaction._id.toString() },
            plusStatus: "full_plus",
          }
        );
      } else {
        await Bookings.updateOne(
          { _id: bookingProcess._id.toString() },
          { plusStatus: "full_plus" }
        );
      }
    });
  } catch (error) {
    console.error("Error plus money", error);
  }
}

// Trả chủ space tháng
async function plusMonth() {
  
  const now = new Date();
  console.log(now);
  
  try {
    const bookingProcessList = await Bookings.find({
      // ownerApprovalStatus: "accepted",
      status: "completed",
      startDate: { $lt: new Date() },
      rentalType: "month",
      plusStatus: { $ne: "full_plus" },
    })
      .populate({
        path: "spaceId", // Populate không gian
        populate: {
          path: "userId", // Populate userId của không gian
          select: "fullname", // Lấy chỉ trường fullname của người dùng
        },
      })
      .populate("refundTransId")
      .populate("plusTransId");
    console.log(bookingProcessList);
      
    bookingProcessList.forEach(async (bookingProcess) => {
      if (bookingProcess.refundTransId) {
        let amount = Number(bookingProcess.totalAmount);
        amount = Number(amount) - Number(bookingProcess.refundTransId.amount);
        bookingProcess.plusTransId.forEach(plusTrans => amount = Number(amount) - Number(plusTrans.amount))
        if (amount > 0) {
          const {transaction} = await transactionDao.transferMoneyBooking(
            bookingProcess.spaceId.userId,
            "Cộng tiền",
            "Thành công",
            amount,
            `Tiền cho thuê không gian ${bookingProcess.spaceId.name}`
          );
          await Bookings.updateOne(
            { _id: bookingProcess._id.toString() },
            {
              $push: { plusTransId: transaction._id.toString() },
              plusStatus: "full_plus",
            }
          );
        }
      } else {
        let amount = Number(bookingProcess.totalAmount);
        bookingProcess.plusTransId.forEach(plusTrans => amount = Number(amount) - Number(plusTrans.amount));
        if (now.getDate() === 8) {
          // Tuần đầu
          const {transaction} = await transactionDao.transferMoneyBooking(
            bookingProcess.spaceId.userId,
            "Cộng tiền",
            "Thành công",
            bookingProcess.totalAmount * 25 / 100,
            `Tiền cho thuê không gian ${bookingProcess.spaceId.name} tuần 1`
          );
          await Bookings.updateOne(
            { _id: bookingProcess._id.toString() },
            {
              $push: { plusTransId: transaction._id.toString() },
              plusStatus: "1_plus",
            }
          );
          if (now.getDate() === 15) {
            // Tuần đầu
            const {transaction} = await transactionDao.transferMoneyBooking(
              bookingProcess.spaceId.userId,
              "Cộng tiền",
              "Thành công",
              bookingProcess.totalAmount * 25 / 100,
              `Tiền cho thuê không gian ${bookingProcess.spaceId.name} tuần 2`
            );
            await Bookings.updateOne(
              { _id: bookingProcess._id.toString() },
              {
                $push: { plusTransId: transaction._id.toString() },
                plusStatus: "2_plus",
              }
            );
          };
          if (now.getDate() === 22) {
            // Tuần đầu
            const {transaction} = await transactionDao.transferMoneyBooking(
              bookingProcess.spaceId.userId,
              "Cộng tiền",
              "Thành công",
              bookingProcess.totalAmount * 25 / 100,
              `Tiền cho thuê không gian ${bookingProcess.spaceId.name} tuần 3`
            );
            await Bookings.updateOne(
              { _id: bookingProcess._id.toString() },
              {
                $push: { plusTransId: transaction._id.toString() },
                plusStatus: "3_plus",
              }
            );
          };
          if (now.getDate() === 1) {
            // Tuần đầu
            const {transaction} = await transactionDao.transferMoneyBooking(
              bookingProcess.spaceId.userId,
              "Cộng tiền",
              "Thành công",
              amount,
              `Tiền cho thuê không gian ${bookingProcess.spaceId.name}`
            );
            await Bookings.updateOne(
              { _id: bookingProcess._id.toString() },
              {
                $push: { plusTransId: transaction._id.toString() },
                plusStatus: "full_plus",
              }
            );
          };
        }

      }
    });
  } catch (error) {
    console.error("Error plus money", error);
  }
}

export const refundOwnerSpace = {plusHour,plusDay, plusWeek, plusMonth}
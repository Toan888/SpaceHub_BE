import { notificationDao } from "../dao/index.js";
import { transactionDao } from "../dao/transactionDao.js";
import {
  createTransaction,
  generateOrderId,
  verifySignature,
  isSuccess,
} from "../externals/vnpay.js";
import SystemProrperties from "../models/systemPropertiesModel.js";
import { TransactionsModel } from "../models/transactionsModel.js";
import Users from "../models/users.js";

export const transactionCreate = async (req, res) => {
  const { amount, userId, type, beneficiaryAccountNumber, beneficiaryBankCode } = req.body;
  try {
    if (amount <= 0) {
      res.status(400).json({ message: "Yêu cầu không hợp lệ" });
      return;
    }
    const user = await Users.findById(userId);
    if (!user) {
      res.status(400).json({ message: "Yêu cầu không hợp lệ" });
      return;
    }

    if (type === "Nạp tiền") {
      const orderId = generateOrderId();

      const data = await createTransaction(
        orderId,
        amount,
        `${user.username} nap tien vao tai khoan`
      );

      transactionDao.save({
        userId,
        amount,
        description: `${user.fullname} nạp tiền vào tài khoản`,
        orderId,
        type,
        status: "Khởi tạo",
      });
      res.status(200).json(data);
      return;
    } else if (type === "Rút tiền") {
      const deductedAmount = amount * 0.95;
      if (!user.balanceAmount || user.balanceAmount < Number(amount) || !beneficiaryAccountNumber || !beneficiaryBankCode) {
        res
          .status(400)
          .json({ message: "Số dư không đủ để thực hiện yêu cầu" });
        return;
      }
      await Users.updateOne(
        { _id: userId },
        { balanceAmount: user.balanceAmount - Number(amount) }
      );
      await transactionDao.save({
        userId,
        amount,
        deductedAmount, 
        description: `${user.fullname} rút tiền từ tài khoản`,
        orderId: "SYSTEM" + new Date().getTime(),
        type,
        status: "Khởi tạo",
        beneficiaryAccountNumber,
        beneficiaryBankCode,
        fee: amount - Math.floor(amount * 95 / 100)

      });
      const adminList = await Users.find({ role: 1 });
      const userAvatar = user?.avatar || "https://cellphones.com.vn/sforum/wp-content/uploads/2023/10/avatar-trang-4.jpg";

      adminList.forEach((admin) => {
        notificationDao.saveAndSendNotification(
          admin._id.toString(),
          `${user.fullname} đã gửi yêu cầu rút tiền`, userAvatar, "/admin#manage-spaces"
        );
      });
      res.status(200).json({ message: "Khởi tạo giao dịch thành công, yêu cầu của bạn sẽ được xử lí trong 2 - 3 ngày tới" });
      return;
    }

    res.status(400).json({ message: "Yêu cầu không hợp lệ" });
    return;
  } catch (error) {
    console.log(error);
    res.status(500);
  }
};

export const transactionConfirmMomo = async (req, res) => {
  const {
    accessKey,
    amount,
    extraData,
    message,
    orderId,
    orderInfo,
    orderType,
    partnerCode,
    payType,
    requestId,
    responseTime,
    resultCode,
    transId,
    signature,
  } = req.body;
  try {
    if (
      !verifySignature(
        {
          accessKey,
          amount,
          extraData,
          message,
          orderId,
          orderInfo,
          orderType,
          partnerCode,
          payType,
          requestId,
          responseTime,
          resultCode,
          transId,
        },
        signature
      )
    ) {
      res.status(404).json({ message: "not found" });
      return;
    }
    const transaction = await TransactionsModel.findOne({ orderId });
    if (!transaction || transaction.status !== "Khởi tạo") {
      res.status(404).json({ message: "not found" });
      return;
    } else {
      if (transaction.type === "Nạp tiền") {
        await TransactionsModel.updateOne(
          { _id: transaction._id.toString() },
          { status: isSuccess(resultCode) ? "Thành công" : "Thất bại", amount }
        );

        if (isSuccess(resultCode)) {
          const user = await Users.findById(transaction.userId);
          await Users.updateOne(
            { _id: transaction.userId },
            { balanceAmount: user.balanceAmount + Number(amount) }
          );
        }
        res.status(200).json({ message: "success" });
        return;
      }
      res.status(404).json({ message: "not found" });
      return;
    }
  } catch (error) {
    console.log(error);
    res.status(404).json({ message: "not found" });
    return;
  }
};


export const transactionConfirm = async (req, res) => {  
  const {
    vnp_Amount,
    vnp_BankCode,
    vnp_BankTranNo,
    vnp_CardType,
    vnp_OrderInfo,
    vnp_PayDate,
    vnp_ResponseCode,
    vnp_TmnCode,
    vnp_TransactionNo,
    vnp_TransactionStatus,
    vnp_TxnRef,
    vnp_SecureHash
} = req.body;
  try {
    if (
      !verifySignature(
        {
          vnp_Amount,
          vnp_BankCode,
          vnp_BankTranNo,
          vnp_CardType,
          vnp_OrderInfo: encodeURIComponent(vnp_OrderInfo).replace(/%20/g, '+'),
          vnp_PayDate,
          vnp_ResponseCode,
          vnp_TmnCode,
          vnp_TransactionNo,
          vnp_TransactionStatus,
          vnp_TxnRef
        },
        vnp_SecureHash
      )
    ) {
      res.status(404).json({ message: "not found" });
      return;
    }
    const amount = Number(vnp_Amount) /100;
    const transaction = await TransactionsModel.findOne({ orderId: vnp_TxnRef });
    if (!transaction || transaction.status !== "Khởi tạo") {
      res.status(404).json({ message: "not found" });
      return;
    } else {
      if (transaction.type === "Nạp tiền") {
        await TransactionsModel.updateOne(
          { _id: transaction._id.toString() },
          { status: isSuccess(vnp_ResponseCode) ? "Thành công" : "Thất bại", amount }
        );

        if (isSuccess(vnp_ResponseCode)) {
          const user = await Users.findById(transaction.userId);
          await Users.updateOne(
            { _id: transaction.userId },
            { balanceAmount: user.balanceAmount + Number(amount) }
          );
        }
        res.status(200).json({ message: "success" });
        return;
      }
      res.status(404).json({ message: "not found" });
      return;
    }
  } catch (error) {
    console.log(error);
    res.status(404).json({ message: "not found" });
    return;
  }
};

///http://localhost:3000/addfund/result?partnerCode=MOMO&orderId=MOMO1731137931267&requestId=MOMO1731137931267&amount=1000&orderInfo=undefined+n%E1%BA%A1p+ti%E1%BB%81n+v%C3%A0o+t%C3%A0i+kho%E1%BA%A3n&orderType=momo_wallet&transId=4225107942&resultCode=0&message=Successful.&payType=qr&responseTime=1731137968770&extraData=&signature=2068ac90836a9aacdefd4995b58ed03f0b1f1d27046b7ca371b92175bb5437a6
export const getAllTransaction = async (req, res) => {
  try {
    const { userId, page = 1, limit = 10 } = req.query;
    if (!userId) {
      res.status(400).json({ message: "bad request" });
      return;
    }
    const user = await Users.findById(userId);
    if (!user) {
      res.status(400).json({ message: "bad request" });
      return;
    }
    const transactionList = await TransactionsModel.find({ userId })
    .skip((page - 1) * limit) // Skip documents for previous pages
    .limit(limit) // Limit results to the page size
    .sort({
      createdAt: -1,
    });
    const totalElement = await TransactionsModel.countDocuments({ userId });
    const dataRes = transactionList.map((transaction) => {
      return {
        transactionId: transaction._id.toString(),
        amount: transaction.type === "Rút tiền" ? transaction.amount - (transaction.fee || 0) : transaction.amount,
        deductedAmount: transaction.deductedAmount,
        description: transaction.description,
        type: transaction.type,
        status: transaction.status,
        createdAt: transaction.createdAt.toLocaleString(),
        reasonRejected: transaction.reasonRejected
      };
    });
    res
      .status(200)
      .json({ balanceAmount: user.balanceAmount, transactionList: dataRes, pagination: {
        totalPage: Math.floor(totalElement / limit) + 1,
        totalElement
      } });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: "bad request" });
  }
};

export const adminGetAllTransaction = async (req, res) => {
  try {
    const { searchParams, startTime, endTime, typeOfTransaction, page = 1, limit = 10 } = req.query;
    const searchQuery = {};
    if (searchParams) {
      searchQuery['$or'] = [
        { orderId: new RegExp(searchParams, 'i') }, 
        { description: new RegExp(searchParams, 'i') }, 
        { status: new RegExp(searchParams, 'i') }, 
        { type: new RegExp(searchParams, 'i') }, 
        { 'userId.avatar': new RegExp(searchParams, 'i') },
        { 'userId.fullname': new RegExp(searchParams, 'i') },
        { 'userId.gmail': new RegExp(searchParams, 'i') },
        { 'user.phone': new RegExp(searchParams, 'i') }
      ];
    }

    if (typeOfTransaction && typeOfTransaction !== "Tất cả") {
      searchQuery["type"] = typeOfTransaction;
    } else {
      searchQuery["type"] = { $in: ["Nạp tiền", "Trừ tiền", "Cộng tiền", "Hoàn tiền", "Rút tiền"] };
    }

    if (startTime && endTime) {
      searchQuery["createdAt"] = {
        $gte: new Date(startTime),
        $lte: new Date(endTime),
      };
    } else if (startTime) {
      searchQuery["createdAt"] = {
        $gte: new Date(startTime),
      };
    } else if (endTime) {
      searchQuery["createdAt"] = {
        $lte: new Date(endTime),
      };
    }

    const transactionList = await TransactionsModel.find(searchQuery)
      .populate({
        path: "userId",
        select: 'avatar fullname gmail phone'  // Only select these fields from the User model
      })
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({
        createdAt: -1,
      })
      .exec();
    const totalElement = await TransactionsModel.countDocuments(searchQuery);
    const dataRes = transactionList.map((transaction) => {
      return {
        transactionId: transaction._id.toString(),
        userInfoAvatar: [transaction.userId.avatar].join("\n"),
        userInfo: [
          transaction.userId.fullname,
          transaction.userId.gmail,
          transaction.userId.phone,
        ].join("\n"),
        orderId: transaction.orderId,
        amount: transaction.type === "Rút tiền" ? transaction.amount - (transaction.fee || 0) : transaction.amount,
        description: transaction.description,
        type: transaction.type,
        status: transaction.status,
        createdAt: transaction.createdAt.toLocaleString(),
      };
    });
    res.status(200).json({
      transactionList: dataRes,
      pagination: {
        totalPage: Math.floor(totalElement / limit) + 1,
        totalElement,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: "bad request" });
  }
};


export const adminConfirmTransaction = async (req, res) => {
  try {
    const { transactionId, result,reasonRejected } = req.body;
    console.log(transactionId)
    const transaction = await TransactionsModel.findById({ _id: transactionId }).populate({path: "userId", select: "fullname avatar"});

    if (!transaction) {
      res.status(400).json({ message: "Yêu cầu không hợp lệ" });
      return;
    }
    
    if (result === "Đồng ý - Khởi tạo") {
      console.log('Số tiền gốc: ', transaction.amount); 
      const deductedAmount = transaction.amount * 0.95; 
      console.log('Số tiền đã giảm: ', deductedAmount); 

      if (transaction.beneficiaryBankCode === "MOMO") {
        res.status(200).json({ 
          transactionId,
          beneficiaryBankCode: transaction.beneficiaryBankCode, 
          beneficiaryAccountNumber: transaction.beneficiaryAccountNumber,
          amount: deductedAmount, // Dùng số tiền đã giảm
          qrUrl: "https://test-payment.momo.vn/payment-platform/images/qr-code-download-app.png"
        });
        return;
      } else {
        res.status(200).json({ 
          transactionId,
          beneficiaryBankCode: transaction.beneficiaryBankCode, 
          beneficiaryAccountNumber: transaction.beneficiaryAccountNumber,
          amount: transaction.amount - (transaction.fee || 0),
          // qrUrl: `https://img.vietqr.io/image/${transaction.beneficiaryBankCode}-${transaction.beneficiaryAccountNumber}-compact2.jpg?amount=${deductedAmount}&addInfo=${transaction.description}&accountName=${transaction.userId.fullname}`
          qrUrl: `https://img.vietqr.io/image/${transaction.beneficiaryBankCode}-${transaction.beneficiaryAccountNumber}-compact2.jpg?amount=${transaction.amount - (transaction.fee || 0)}&addInfo=${transaction.description}&accountName=${transaction.userId.fullname}`,
        });
        return;
      }
    }
    

    if (result === "Đồng ý - Xác nhận") {
      await TransactionsModel.updateOne({_id: transactionId}, {status: "Thành công"})

      await transactionDao.save({
        userId: transaction.userId,
        amount: transaction.fee,
        description: `Cộng lợi nhuận từ giao dịch rút tiền ${transaction.orderId}`,
        orderId:  "SYSTEM" + new Date().getTime(),
        type: "Tăng số dư ví admin",
        status: "Thành công",
      });

      const profitAmountRecord = await SystemProrperties.findOne({ code: "profit_amount" });
      let profitAmount = transaction.fee || 0;
      if (profitAmountRecord) {
        let currentValue = Number(profitAmountRecord.value);
        if (isNaN(currentValue)) {
          currentValue = 0;
        }
        profitAmount += currentValue;
      }
      await SystemProrperties.updateOne(
        { code: "profit_amount" },
        { 
          $set: { value: profitAmount } 
        },
        { upsert: true } 
      );
      await notificationDao.saveAndSendNotification(
        transaction.userId._id.toString(),
        "Yêu cầu rút tiền của bạn đã được phê duyệt.",
        transaction.userId.avatar,
        "/addfund"
      );
      res.status(200).json({ message: "Xác nhận thanh toán giao dịch rút tiền thành công" });
      return
    }

    if (result === "Từ chối - Xác nhận") {
      await TransactionsModel.updateOne({_id: transactionId}, {status: "Thất bại", reasonRejected: reasonRejected})   
      
      const user = await Users.findById(transaction.userId)
      await Users.updateOne(
        { _id: transaction.userId },
        { balanceAmount: user.balanceAmount + Number(transaction.amount) }
      );
      await notificationDao.saveAndSendNotification(
        transaction.userId._id.toString(),
        "Yêu cầu rút tiền của bạn đã bị từ chối.",
        transaction.userId.avatar,
        "/addfund"
      );
      res.status(200).json({ message: "Đã từ chối giao dịch rút tiền" });
      return
    }

  } catch (error) {
    console.log(error);
    res.status(400).json({ message: "bad request" });
  }
};
export const adminWalletTransaction = async (req, res) => {
  try {
    const { searchParams, startTime, endTime, typeOfTransaction, page = 1, limit = 10  } = req.query;
    const searchQuery = {};
    if (searchParams) {
      searchQuery["$or"] = [
        { orderId: new RegExp(searchParams, "i") },
        { description: new RegExp(searchParams, "i") },
        { "userId.fullname": new RegExp(searchParams, "i") },
        { "userId.gmail": new RegExp(searchParams, "i") },
        { "user.phone": new RegExp(searchParams, "i") },
      ];
    }

    if (typeOfTransaction && typeOfTransaction !== "Tất cả") {
      searchQuery["type"] = typeOfTransaction;
    } else {
      searchQuery["type"] = { $in: ["Tăng số dư ví admin", "Giảm số dư ví admin"] };
    }

    if (startTime && endTime) {
      searchQuery["createdAt"] = {
        $gte: new Date(startTime).setHours(0, 0, 0, 0),
        $lte: new Date(endTime).setHours(23, 59, 59, 999),
      };
    } else if (startTime) {
      searchQuery["createdAt"] = {
        $gte: new Date(startTime).setHours(0, 0, 0, 0),
      };
    } else if (endTime) {
      searchQuery["createdAt"] = {
        $lte: new Date(endTime).setHours(23, 59, 59, 999),
      };
    }

    const transactionList = await TransactionsModel.find(searchQuery)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({
        createdAt: -1,
      })
      .exec();
    const totalElement = await TransactionsModel.countDocuments(searchQuery);
    const dataRes = transactionList.map((transaction) => {
      return {
        transactionId: transaction._id.toString(),
        orderId: transaction.orderId,
        amount: transaction.amount,
        description: transaction.description,
        type: transaction.type,
        createdAt: transaction.createdAt.toLocaleString(),
      };
    });
    const availableAmount = await transactionDao.getWalletAvailableAmount();
    res.status(200).json({
      availableAmount: availableAmount,
      transactionList: dataRes,
      pagination: {
        totalPage: Math.floor(totalElement / limit) + 1,
        totalElement,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: "bad request" });
  }
};

export const admiWithdrawTransaction = async (req, res) => {
  try {
    const { amount, userId  } = req.body;

    const availableAmount = await transactionDao.getWalletAvailableAmount();

    if (isNaN(Number(amount)) || Number(amount) <= 0) {
      res.status(400).json({ message: "Số tiền không hợp lệ" });
      return;      
    }

    if (Number(amount) > availableAmount) {
      res.status(400).json({ message: "Ví không đủ số dư" });
      return;      
    }

    await transactionDao.save({
      userId,
      amount,
      description: `Nhận tiền từ ví Admin`,
      orderId: "SYSTEM" + new Date().getTime(),
      type: "Giảm số dư ví admin",
      status: "Thành công",
    });   

    res.status(200).json({ message: "Nhận tiền thành công" });
    return;
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: "bad request" });
  }
};
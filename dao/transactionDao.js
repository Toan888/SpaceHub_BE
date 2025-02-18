import SystemProrperties from "../models/systemPropertiesModel.js";
import { TransactionsModel } from "../models/transactionsModel.js";
import Users from "../models/users.js";

async function save(transactions) {
  try {
    const transactionsModel = new TransactionsModel(transactions);
    const transactionData = await transactionsModel.save();
    return transactionData;
  } catch (error) {
    console.error("Error saving transactionsModel:", error);
    throw error;
  }
}

async function transferMoneyBooking(userId, type, status, amount, description, originalTransactionId) {
  try {
    const user = await Users.findById(userId)
    if (type === "Trừ tiền") {
      if (user.balanceAmount < Number(amount)) {
        return {status: "failed", message:"Số dư không đủ để thực hiện giao dịch"}
      }
      await Users.updateOne({_id: userId}, {balanceAmount: user.balanceAmount - Number(amount)})
      const systemAccountBalance = await SystemProrperties.findOne({code: "system_account_balance"})
      await SystemProrperties.updateOne({code: "system_account_balance"}, {value: Number(systemAccountBalance.value) + Number(amount)})
      const transactionsModel = new TransactionsModel({
        userId,
        orderId: "SYSTEM" + new Date().getTime(),
        description,
        type,
        status,
        amount
      });
      const transaction = await transactionsModel.save();
      return {status: "success", message:"Thành công", transaction}
    }

    if (type === "Cộng tiền") {
      const systemAccountBalance = await SystemProrperties.findOne({code: "system_account_balance"})
      const newAmount =  Number(systemAccountBalance.value) - Number(amount);
      await SystemProrperties.updateOne({code: "system_account_balance"}, {value: newAmount})
      const newUserAmount = user.balanceAmount + Number(amount);
      await Users.updateOne({_id: userId}, {balanceAmount: newUserAmount})

      const transactionsModel = new TransactionsModel({
        userId,
        orderId: "SYSTEM" + new Date().getTime(),
        description,
        type,
        status,
        amount
      });
      const transaction = await transactionsModel.save();
      return {status: "success", message:"Thành công", transaction}
    }


    if (type === "Hoàn tiền") {
      const systemAccountBalance = await SystemProrperties.findOne({code: "system_account_balance"})
      await SystemProrperties.updateOne({code: "system_account_balance"}, {value: Number(systemAccountBalance.value) - Number(amount)})
      await Users.updateOne({_id: userId}, {balanceAmount: user.balanceAmount + Number(amount)})

      const transactionsModel = new TransactionsModel({
        userId,
        orderId: "SYSTEM" + new Date().getTime(),
        description,
        type,
        status,
        amount: amount,
        originalTransactionId
      });
      const transaction = await transactionsModel.save();
      return {status: "success", message:"Thành công", transaction}
    }
    return {status: "failed", message:"Lỗi giao dịch"}
  } catch (error) {
    console.error("Error saving transactionsModel:", error);
    return {status: "failed", message:"Lỗi giao dịch"}
  }
}

const getWalletAvailableAmount = async () => {
  const type1 = await TransactionsModel.aggregate([
    {
      $match: { type: "Tăng số dư ví admin" },
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: "$amount" },
      },
    },
  ]);

  const type2 = await TransactionsModel.aggregate([
    {
      $match: { type: "Giảm số dư ví admin" },
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: "$amount" },
      },
    },
  ]);
  const incomeWallet = type1 && type1.length > 0 ? type1[0].totalAmount : 0
  const outcomeWallet = type2 && type2.length > 0 ? type2[0].totalAmount : 0
  return incomeWallet - outcomeWallet;
}
export const transactionDao = { save, transferMoneyBooking,getWalletAvailableAmount };

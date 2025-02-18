import MessageModel from "../models/messageModel.js";

 const addMessage = async (req, res) => {
  const { chatId, senderId, text } = req.body;
  const message = new MessageModel({
    chatId,
    senderId,
    text,
  });
  try {
    const result = await message.save();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json(error);
  }
};

 const getMessages = async (req, res) => {
  const { chatId } = req.params;
  if (!chatId) {
    return res.status(400).json({ message: "Chat ID không hợp lệ" });
  }
  try {
    const result = await MessageModel.find({ chatId });
    if (!result || result.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy tin nhắn nào" });
    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json(error);
  }
};

export default {addMessage,getMessages}
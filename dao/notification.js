import { socketAction } from "../helpers/constants.js";
import { getSocket, getUserList } from "../helpers/socket.io.js";
import Notification from "../models/notification.js";
import Users from "../models/users.js";

async function saveNotification(userId, content, imageUrl = null, url = null) {
  try {
    const notification = new Notification({
      userId,
      content,
      imageUrl,
      url,
      isRead: false,
    });
    const savedNotification = await notification.save();
    return savedNotification;
  } catch (error) {
    console.error("Error saving notification:", error);
    throw error;
  }
}

async function getNotificationsByUserId(userId) {
  try {
    const query = { userId };
    const notifications = await Notification.find(query).sort({
      createdAt: -1,
    });
    return notifications;
  } catch (error) {
    console.error("Error retrieving notifications:", error);
    throw error;
  }
}

async function markNotificationAsRead(notificationArr, userId) {
  try {
    const result = await Notification.updateMany(
      { _id: { $in: notificationArr }, userId: userId },
      {
        $set: { isRead: true },
      }
    );
    console.log(`Marked ${result.nModified} notifications as read.`);
    return result;
  } catch (error) {
    console.error("Error updating notification:", error);
    throw error;
  }
}

async function saveAndSendNotification(
  userId,
  content,
  imageUrl = null,
  url = null
) {
  try {
    // Lấy thông tin người dùng từ userId
    const user = await Users.findById(userId);

    if (!user) {
      throw new Error("User not found");
    }
    // Nếu người dùng không có avatar, sử dụng avatar mặc định
    const userAvatar = user?.avatar || "https://example.com/default-avatar.png";

    // Nếu imageUrl không phải null (được truyền vào), sử dụng imageUrl thay vì avatar mặc định
    const finalImageUrl = imageUrl || userAvatar;

    // Gọi hàm saveNotification với avatar người dùng
    const notification = await saveNotification(
      userId,
      content,
      finalImageUrl, 
      url
    );
  const userConnectedList = getUserList();
  const io = getSocket();
  userConnectedList
    .filter((userConnected) => userConnected.id === userId)
    .forEach((userConnected) => {
      io.to(userConnected.connectedId).emit(
        socketAction.NEW_NOTI,
        notification
      );
    });
  } catch (error) {
    console.error("Error in saveAndSendNotification:", error);
  }
}

export default {
  saveNotification,
  getNotificationsByUserId,
  markNotificationAsRead,
  saveAndSendNotification,
};

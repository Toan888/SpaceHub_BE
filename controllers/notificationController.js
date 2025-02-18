import { notificationDao } from "../dao/index.js";

const getAllNotifications = async (req, res) => {
  const { userId } = req.query;
  // console.log(`Get all notification userId ${userId}`);
  try {
    const notificationList = await notificationDao.getNotificationsByUserId(
      userId
    );
    // console.log(
    //   `Get all notification userId ${userId} total ${notificationList.length} notifications`
    // );
    res.status(200).send(notificationList);
  } catch (error) {
    // console.log(error);
    res.status(500).json({message: error.toString()})
  }
};

const markAllNotificationsAsRead = async (req, res) => {
  const { notificationList, userId } = req.body;
  // console.log(
  //   `Mark all notification as read userId ${userId} notificationList: ${notificationList}`
  // );
  try {
    await notificationDao.markNotificationAsRead(notificationList, userId);
    res.status(200).json({ message: "success" });
  } catch (error) {
    // console.log(error);
    res.status(500).json({message: error.toString()})
  }
};

export default  { getAllNotifications, markAllNotificationsAsRead };

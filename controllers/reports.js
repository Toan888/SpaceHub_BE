import { reportsDao, notificationDao } from "../dao/index.js";
import Spaces from "../models/spaces.js";
import Users from "../models/users.js";

const getAllReports = async(req, res) =>{
  try {
    const allReports = await reportsDao.fetchAllReports()
    if (!allReports) {
      return res.status(500).json({ error: "Cannot retrieve reports" });
    }
    res.status(200).json(allReports)
  } catch (error) {
    res.status(500).json({ error: error.message });

  }
}

const createReports = async (req, res) => {
  try {
    const { reasonId, userId, spaceId, customReason,statusReport = "Chờ duyệt"  } = req.body;
    const report = await reportsDao.createReports(reasonId, userId, spaceId, customReason,statusReport);
    
     // Kiểm tra xem người dùng đã báo cáo không gian này chưa
    //  const existingReport = await reportsDao.findReportByUserAndSpace(userId, spaceId);
    //  if (existingReport) {
    //    return res.status(400).json({ message: "Bạn đã báo cáo không gian này trước đó rồi." });
    //  }


    const space = await Spaces.findById(spaceId);
    const user = await Users.findById(userId);
    const userAvatar = user?.avatar || "https://cellphones.com.vn/sforum/wp-content/uploads/2023/10/avatar-trang-4.jpg";

    if (space.reportCount >= 3) {
      await Spaces.findByIdAndUpdate(
        spaceId,
        { censorship: "Chờ duyệt" },
        { new: true }
      );
    
      await notificationDao.saveAndSendNotification(
        space.userId.toString(),
        `${space.name} đã chuyển sang trạng thái thành chờ duyệt do bị tố cáo quá 3 lần.`,
        userAvatar
      );
    }

    await notificationDao.saveAndSendNotification(
      space.userId.toString(),
      `${user?.fullname} đã tố cáo không gian ${space?.name} của bạn và đang chờ xét duyệt.`,
      userAvatar,
      "/report"
    );

    const adminList = await Users.find({ role: 1 });
    adminList.forEach((admin) => {
      notificationDao.saveAndSendNotification(
        admin._id.toString(),
        `${user?.fullname} đã tố cáo không gian ${space?.name}, cần xét duyệt.`,
        space.images && space.images.length > 0
          ? space.images[0].url
          : null, "/admin#manage-spaces-report"
      );
    });
    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
};

export default { createReports,getAllReports };

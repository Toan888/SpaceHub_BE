import Reports from "../models/reports.js";
import Spaces from "../models/spaces.js";

const fetchAllReports = async () => {
  try {
    const allReports = await Reports.find({})
    .populate("reasonId")
    .populate("userId")
    .populate({
      path: "spaceId", // Populate không gian
      populate: [
        {
          path: "userId", // Populate userId của không gian
          select: "fullname", // Chỉ lấy trường fullname từ bảng users
        },
        {
          path: "appliancesId", // Populate appliancesId của không gian
          select: "appliances", // Chỉ lấy trường appliances từ bảng appliances
          populate: {
            path: "appliances", // Populate các đối tượng trong mảng appliances
            select: "name", // Chỉ lấy các trường name và iconName từ mảng appliances
          },
        },
      ],
    })
    .exec();
    return allReports;
  } catch (error) {
    throw new Error(error.message);
  }
};

const findReportByUserAndSpace = async (userId, spaceId) => {
  try {
    return await Reports.findOne({ userId, spaceId }).lean();
  } catch (error) {
    throw new Error(error.message);
  }
};


const createReports = async (reasonId, userId, spaceId, customReason,statusReport = "Chờ duyệt") => {
  try {
    const createReport = await Reports.create({
      reasonId,
      userId,
      spaceId,
      customReason,
      statusReport,
    }); 
    return createReport;
  } catch (error) {
    throw new Error(error.toString());
  }
};

export default { createReports, fetchAllReports,findReportByUserAndSpace };

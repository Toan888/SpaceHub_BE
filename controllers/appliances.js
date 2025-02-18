import { appliancesDao } from "../dao/index.js";


// Lấy các tiện ích có sẵn
export const getAllAppliances = async (req, res) => {
  try {
    const appliances = await appliancesDao.fetchAllAppliances();
    if (!appliances) {
      return res.status(500).json({ error: "Error: Cannot retrieve appliances" });
    }
    return res.status(200).json(appliances);
  } catch (error) {
    res.status(500).json({ error: `Error: ${error.message}` });
  }
};

export const getAllAppliancesByCategories = async (req, res) => {
  try {
    const categoryId = req.params.cateid
    const appliances = await appliancesDao.fetchAllAppliancesCategories(categoryId);
    return res.status(200).json(appliances);
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};


// Hàm thêm appliance mới
const createAppliance = async (req, res) => {
  try {
    const { name, appliances, categoryId } = req.body;
    if (!appliances && !categoryId) {
      return res.status(400).json({
        success: false,
        message: "appliances and categoryId cannot be empty",
      });
    }
    if (!Array.isArray(appliances) || appliances.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Appliances list cannot be empty",
      });
    }

    // Kiểm tra categoryId riêng lẻ
    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "categoryId cannot be empty",
      });
    }



    // Tạo dữ liệu appliance mới
    const applianceData = {
      name,
      appliances,
      categoryId, // Có thể để trống nếu không có categoryId
    };

    // Thêm appliance mới qua DAO
    const newAppliance = await appliancesDao.addAppliance(applianceData);

    return res.status(201).json({ success: true, appliance: newAppliance });
  } catch (error) {
    if (error.message.includes("Duplicate key error")) {
      return res.status(409).json({ success: false, message: "Appliance already exists" });
    }

    return res.status(500).json({ success: false, message: "Error creating appliance" });
  }

};

export default { getAllAppliances, getAllAppliancesByCategories, createAppliance };

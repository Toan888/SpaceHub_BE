import { systemDao } from "../dao/index.js";

const getSystemProperties = async (req, res, next) => {
  try {
    const system = await systemDao.getAllSystem();
    if (!system || system.length === 0) {
      return res.status(404).json({ message: "System not found" });
    }
    res.status(200).json(system);
  } catch (error) {
    next(error);
  }
};

export default { getSystemProperties };
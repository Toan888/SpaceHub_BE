import systemProrperties from "../models/systemPropertiesModel.js";

class SystemPropertiesDAO {
  static async getAllSystem() {
    try {
      const system = await systemProrperties.find().exec();
      return system;
    } catch (error) {
      throw new Error(error.message);
    }
  }
}

export default SystemPropertiesDAO;
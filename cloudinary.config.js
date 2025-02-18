import pkg from 'cloudinary'; // Nhập package cloudinary dưới dạng mặc định
const { v2: cloudinary } = pkg; // Lấy named export v2 từ package đã nhập
import dotenv from "dotenv";

dotenv.config();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});


export default cloudinary;

import bcrypt from "bcrypt";
import Users from "../models/users.js";
import { userDao } from "../dao/index.js";
import nodemailer from "nodemailer";
import otpGenerator from "otp-generator";
import dayjs from "dayjs";
import jwt from "jsonwebtoken";
import cloudinary from "../cloudinary.config.js";

const getAllUsers = async (req, res) =>{
  try {
    const allUsers = await userDao.fetchAllUsers();
    res.status(200).json(allUsers)
  } catch (error) {
    res.status(500).json({error:error.toString()})
  }
}
const getUserByUserName = async (req, res) =>{
  try {
    const username = await userDao.fetchUserByUsername(req.params.username)
    res.status(200).json(username)
  } catch (error) {
    res.status(500).json({error:error.toString()})
  }
}

const changePass = async (req, res) => {
  try {
    const { username } = req.params;
    const { oldPassword, newPassword } = req.body;
    console.log('Username:', username);
    console.log('Old Password:', oldPassword);
    console.log('New Password:', newPassword);

    if (!username || !oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ status: false, message: "Thiếu các trường bắt buộc" });
    }

    const user = await Users.findOne({ username });

    if (!user) {
      return res.status(404).json({ status: false, message: "Không tìm thấy người dùng" });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    console.log('Password match:', isMatch);

    if (!isMatch) {
      console.log('Old password is incorrect');

      return res
        .status(400)
        .json({ status: false, message: "Mật khẩu cũ không đúng" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    res
      .status(200)
      .json({ status: true, message: "Thay đổi mật khẩu thành công" });
  } catch (error) {
    console.error('Error in changePass:', error);

    res
      .status(500)
      .json({ status: false, message: "Server error", error: error.message });
  }
};

const forgetPass = async (req, res) => {
    const { gmail } = req.body;
    try {
      const user = await userDao.forgotPass(gmail);
      if (!user) {
        return res.status(404).send({ Status: "Không thành công", Error: "Người dùng không tồn tại" });
      }
      const token = jwt.sign({ id: user._id }, "jwt_secret_key", {
        expiresIn: "1d",
      });
      var transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "thang2k210@gmail.com",
          pass: "bqvh osxx crfn giai",
        },
      });
  
      var mailOptions = {
        from: "thang2k210@gmail.com",
        to: gmail,
        subject: "Đặt lại mật khẩu",
        html: `
        <div style="font-family: Arial, sans-serif; text-align: center;">
          <h2 style="color: #4CAF50;">Đặt lại mật khẩu</h2>
          <p>Xin chào <b>${user.fullname}</b> !!!</p>
          <p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu của bạn tại SpaceHub. Nhấp vào nút bên dưới để đặt lại mật khẩu của bạn:</p>
          <a href="https://spacehub.site/reset-password/${user._id}/${token}" 
             style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-size: 16px;">
            Đặt lại mật khẩu
          </a>
          <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
          <p>Cảm ơn !!!</p>
          <img src="https://res.cloudinary.com/degpdpheb/image/upload/v1726589174/logo_bdn2vl.png"></img>
        </div>
      `,
      };
  
      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          return res.send({ Status: "Lỗi khi gửi mail" });
        } else {
          return res.send({ Status: "Thành công" });
        }
      });
    } catch (error) {
      return res.send({ Status: "Error", Error: error.message });
    }
  };

  const confirmPass = async (req, res) => {
    try {
      const { password, userId } = req.body;
  
      // validate
      if (!password || !userId) {
        return res
          .status(400)
          .json({ status: false, message: "Thiếu các trường bắt buộc" });
      }
  
      const user = await Users.findById(userId).lean();
  
      if (!user) {
        return res
          .status(404)
          .json({ status: false, message: "Không tìm thấy người dùng" });
      }
  
      // check password
      const isMatch = await bcrypt.compare(password, user.password);
  
      if (!isMatch) {
        return res
          .status(400)
          .json({ status: false, message: "Mật khẩu không đúng" });
      }
  
      //  tạo OTP
      const otp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        specialChars: false,
      });
      console.log("otp", otp);
      const salt = await bcrypt.genSalt(10);
      const hashedOtp = await bcrypt.hash(otp, salt);
  
      const today = dayjs();
      const otpExpiredTime = today.add(5, "minute");
  
      await Users.findByIdAndUpdate(userId, {
        otp: hashedOtp,
        otp_expired_time: otpExpiredTime,
      }).lean();
  
      // send otp
      var transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "thang2k210@gmail.com",
          pass: "bqvh osxx crfn giai",
        },
      });
  
      var mailOptions = {
        from: "thang2k210@gmail.com",
        to: user.gmail,
        subject: "Xác nhận lại mật khẩu",
        html: `
          <div style="font-family: Arial, sans-serif; text-align: center;">
            <h2 style="color: #4CAF50;">Xác nhận lại mật khẩu</h2>
            <p>Xin chào <b>${user.fullname}</b> !!!</p>
            <p>Chúng tôi đã nhận được yêu cầu truy cập vào tài khoản ngân hàng của bạn. Vui lòng nhập OTP để truy cập tài khoản ngân hàng, OTP có hiệu lực trong vòng 5 phút</p>
            <div style="width: 100%;font-size: 2rem; text-align: center;">${otp}</div>
            <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
            <p>Cảm ơn !!!</p>
            <img src="https://res.cloudinary.com/degpdpheb/image/upload/v1726589174/logo_bdn2vl.png"></img>
          </div>
        `,
      };
  
      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
          return res.status(500).send({ message: "Lỗi khi gửi mail" });
        } else {
          return res.send({ message: "Thành công" });
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).send({ message: error.message });
    }
  };

  const confirmOtp = async (req, res) => {
    try {
      const { otp, userId } = req.body;
  
      // validate
      if (!otp || !userId) {
        return res
          .status(400)
          .json({ status: false, message: "Thiếu các trường bắt buộc" });
      }
  
      const user = await Users.findById(userId).lean();
  
      if (!user) {
        return res
          .status(404)
          .json({ status: false, message: "Không tìm thấy người dùng" });
      }
  
      // check otp
      const isMatch = await bcrypt.compare(otp, user.otp);
  
      if (!isMatch) {
        return res.status(400).json({ status: false, message: "OTP không đúng" });
      }
  
      const isExpired = dayjs().isAfter(dayjs(user.otp_expired_time)); // default milliseconds
      if (isExpired) {
        return res.status(400).json({
          status: false,
          message: "OTP đã hết hạn, lưu lòng gửi lại OTP",
        });
      }
  
      await Users.findByIdAndUpdate(userId, {
        otp: null,
        otp_expired_time: null,
      }).lean();
  
      return res.json({ message: "OTP chính xác" });
    } catch (error) {
      console.error(error);
      return res.status(500).send({ message: error.message });
    }
  };

  const resentOtp = async (req, res) => {
    try {
      const { userId } = req.body;
  
      // validate
      if (!userId) {
        return res
          .status(400)
          .json({ status: false, message: "Thiếu các trường bắt buộc" });
      }
  
      const user = await Users.findById(userId).lean();
  
      if (!user) {
        return res
          .status(404)
          .json({ status: false, message: "Không tìm thấy người dùng" });
      }
  
      //  tạo OTP
      const otp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        specialChars: false,
      });
      console.log("otp", otp);
      const salt = await bcrypt.genSalt(10);
      const hashedOtp = await bcrypt.hash(otp, salt);
  
      const today = dayjs();
      const otpExpiredTime = today.add(5, "minute");
  
      await Users.findByIdAndUpdate(userId, {
        otp: hashedOtp,
        otp_expired_time: otpExpiredTime,
      }).lean();
  
      // gui otp
      var transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "thang2k210@gmail.com",
          pass: "bqvh osxx crfn giai",
        },
      });
  
      var mailOptions = {
        from: "thang2k210@gmail.com",
        to: user.gmail,
        subject: "Xác nhận lại mật khẩu",
        html: `
          <div style="font-family: Arial, sans-serif; text-align: center;">
            <h2 style="color: #4CAF50;">Xác nhận lại mật khẩu</h2>
            <p>Xin chào <b>${user.fullname}</b> !!!</p>
            <p>Chúng tôi đã nhận được yêu cầu truy cập vào tài khoản ngân hàng của bạn. Vui lòng nhập OTP để truy cập tài khoản ngân hàng, OTP có hiệu lực trong vòng 5 phút</p>
            <div style="width: 100%;font-size: 2rem; text-align: center;">${otp}</div>
            <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
            <p>Cảm ơn !!!</p>
            <img src="https://res.cloudinary.com/degpdpheb/image/upload/v1726589174/logo_bdn2vl.png"></img>
          </div>
        `,
      };
  
      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
          return res.status(500).send({ message: "Lỗi khi gửi mail" });
        } else {
          return res.send({ message: "Thành công" });
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).send({ message: error.message });
    }
  };

  const updateUser = async (req, res) => {
    try {
      if (Object.keys(req.body).length === 0) {
        return res.status(400).json({ message: "No data provided for update" });
      }
      const updateUser = await userDao.updateUser(req.params.id, req.body);
      if (!updateUser) {
        return res.status(404).json({ message: "User not found" });
      }
  
      res.status(200).json(updateUser);
    } catch (error) {
      res.status(500).json({ error: error.toString() });
    }
  };


  const uploadImages = async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
  
      const image = {
        url: req.file.path, // URL của ảnh đã được upload
        public_id: req.file.filename, // public_id của ảnh
      };
  
      // Lấy userId từ request (giả sử bạn đã xác thực và có userId trong req.user)
      const userId = req.body.userId; // Hoặc sử dụng cách khác để lấy userId
  
      // Cập nhật link ảnh vào trường avatar của user
      await Users.findByIdAndUpdate(userId, { avatar: image.url }, { new: true });
  
      return res.status(200).json({
        message: 'Images uploaded successfully',
        images: image, // Trả về thông tin ảnh đã upload
      });
    } catch (error) {
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
  };
  
  
  const removeUserImage = async (req, res) => {
    try {
      const userId = req.params.id; // Lấy ID người dùng từ params
      const user = await Users.findById(userId);
  
      if (!user || !user.avatar) {
        return res.status(404).json({ message: 'User or image not found' });
      }
  
      const public_id = user.avatar.split('/').pop().split('.')[0]; // Lấy public_id từ URL ảnh
  
      // Xóa ảnh trên Cloudinary
      const result = await cloudinary.v2.uploader.destroy(public_id);
  
      if (result.result === 'ok') {
        // Cập nhật lại trường avatar trong cơ sở dữ liệu
        await Users.findByIdAndUpdate(userId, { avatar: null }); // Hoặc giá trị mặc định nếu cần
        return res.status(200).json({ message: 'Image deleted successfully' });
      } else {
        return res.status(400).json({ message: 'Failed to delete image', result });
      }
    } catch (error) {
      console.error('Error deleting user image:', error);
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
  };
  

export default {
  getAllUsers,
  changePass,
  forgetPass,
  getUserByUserName,
  confirmPass,
  confirmOtp,
  resentOtp,
  updateUser,
  uploadImages,
  removeUserImage
};

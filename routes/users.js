import Joi from "joi";
import createError from "http-errors";
import Users from "../models/users.js";
import express from "express";
import bcrypt from "bcrypt";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../cloudinary.config.js";
import multer from 'multer';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  verifyAccessToken,
} from "../helpers/jwt_helper.js";
import { userController } from "../controllers/index.js";
import jwt from "jsonwebtoken";
import BankAccount from "../models/bankAccounts.js";
import UserNeeds from "../models/userNeeds.js";
const usersRouter = express.Router();
usersRouter.put("/changepass/:username", userController.changePass);
usersRouter.get("/", userController.getAllUsers);
usersRouter.post("/forgot-password", userController.forgetPass);
usersRouter.post("/confirm-password", userController.confirmPass);
usersRouter.post("/confirm-otp", userController.confirmOtp);
usersRouter.post("/resent-otp", userController.resentOtp);

// Schema validation bằng Joi cho đăng ký người dùng
const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required().messages({
    "string.base": `"username" phải là một chuỗi ký tự`,
    "string.empty": `"username" không được bỏ trống`,
    "string.min": `"username" phải có ít nhất 3 ký tự`,
    "string.max": `"username" không được vượt quá 30 ký tự`,
  }),
  password: Joi.string().min(6).required().messages({
    "string.empty": `"password" không được bỏ trống`,
    "string.min": `"password" phải có ít nhất 6 ký tự`,
    "any.required": `"password" là bắt buộc`,
  }),

  gmail: Joi.string().email().required().messages({
    "string.email": `"gmail" phải đúng định dạng email`,
    "any.required": `"gmail" là bắt buộc`,
  }),
  fullname: Joi.string().required().messages({
    "string.empty": `"fullname" không được bỏ trống`,
    "any.required": `"fullname" là bắt buộc`,
  }),
  // phone: Joi.string().required().messages({
  //   "string.empty": `"phone" không được bỏ trống`,
  //   "any.required": `"phone" là bắt buộc`,
  // }),
});

// Schema validation bằng Joi cho đăng nhập
const loginSchema = Joi.object({
  username: Joi.string().required().messages({
    "string.empty": `"username" hoặc "gmail" không được bỏ trống`,
    "any.required": `"username" hoặc "gmail" là bắt buộc`,
  }),
  password: Joi.string().required().messages({
    "string.empty": `"password" không được bỏ trống`,
    "any.required": `"password" là bắt buộc`,
  }),
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'spacehub/img_user', // Thư mục trên Cloudinary
    allowed_formats: ['jpg', 'png', 'webp', 'jfif'], // Định dạng được phép
  },
});

// Khởi tạo multer với storage
const upload = multer({ storage: storage });


usersRouter.post('/upload-image', upload.single('imageUser'), userController.uploadImages);
usersRouter.delete('/:id/remove-image', userController.removeUserImage);

usersRouter.post("/login", async (req, res, next) => {
  try {
    // Validate dữ liệu nhập vào
    const { error } = loginSchema.validate(req.body);
    if (error) {
      throw createError.BadRequest(error.details[0].message);
    }

    const { username, password } = req.body;

    // Tìm người dùng bằng username hoặc gmail đã đăng kí
    const user = await Users.findOne({
      $or: [{ username: username }, { gmail: username }],
    }).exec();

    if (!user) throw createError.NotFound("User not registered");

    // Check if the user is banned
    if (user.isBan) {
      return res.status(403).json({ message: "User is banned" }); // 403 Forbidden
    }

    // Kiểm tra mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      throw createError.Unauthorized(
        "Tên người dùng, gmail hoặc mật khẩu không đúng"
      );

    // Tạo access token và refresh token
    const accessToken = await signAccessToken(user._id);
    const refreshToken = await signRefreshToken(user._id);

    // Trả về phản hồi
    res.status(200).json({
      username: user.username,
      accessToken,
      refreshToken,
      id: user._id,
      fullname: user.fullname,
      role: user.role,
      firstLogin: user.firstLogin,
    });
  } catch (error) {
    next(error);
  }
});
//Update tài khoản mặc định cho người dùng

usersRouter.put("/def/:userId", async (req, res, next) => {
  const { userId } = req.params; // Lấy userId từ URL
  const { defaultBankAccountId } = req.body; // Lấy defaultBankAccountId từ body

  try {
    // Kiểm tra xem tài khoản ngân hàng có tồn tại hay không
    const bankAccount = await BankAccount.findById(defaultBankAccountId);
    if (!bankAccount) {
      return res
        .status(404)
        .json({ error: "Tài khoản ngân hàng không tồn tại" });
    }

    // Kiểm tra xem tài khoản ngân hàng có thuộc về người dùng không
    if (bankAccount.user.toString() !== userId) {
      return res
        .status(403)
        .json({ error: "Tài khoản ngân hàng không thuộc về người dùng này" });
    }

    // Cập nhật tài khoản ngân hàng mặc định cho người
    const updatedUser = await Users.findByIdAndUpdate(
      userId,
      { defaultBankAccount: defaultBankAccountId }, // Cập nhật trường defaultBankAccount
      { new: true } // Trả về phiên bản đã cập nhật
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "Người dùng không tìm thấy" });
    }

    res.json(updatedUser); // Gửi phản hồi với thông tin người dùng đã cập nhật
  } catch (err) {
    next(createError(500, "Lỗi khi cập nhật tài khoản ngân hàng mặc định"));
  }
});

// Đăng ký người dùng mới
usersRouter.post("/register", async (req, res, next) => {
  try {
    const { error } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { username, password, gmail, fullname, phone } = req.body;

    const existingUserByUsername = await Users.findOne({ username });
    if (existingUserByUsername) {
      return res.status(409).json({ message: "Tên người dùng đã tồn tại" }); // HTTP 409 Conflict
    }
    const existingUserByGmail = await Users.findOne({ gmail }).exec();
    if (existingUserByGmail)
      throw createError.Conflict("Gmail đã được đăng ký");

    // const hashPass = await bcrypt.hash(
    //   password,
    //   parseInt(process.env.PASSWORD_SECRET)
    // );
    const hashPass = await bcrypt.hash(password, 10);

    const newUser = new Users({
      username,
      gmail,
      password: hashPass,
      fullname,
      phone,
    });

    const savedUser = await newUser.save();

    const accessToken = await signAccessToken(savedUser._id);

    return res.status(201).json({
      message: "Đăng ký thành công",
      accessToken,
      user: {
        id: savedUser._id,
        username: savedUser.username,
        fullname: savedUser.fullname,
        email: savedUser.gmail,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Đăng nhập người dùng
usersRouter.post("/login", async (req, res, next) => {
  try {
    // Validate dữ liệu nhập vào
    const { error } = loginSchema.validate(req.body);
    if (error) {
      throw createError.BadRequest(error.details[0].message);
    }

    const { username, password } = req.body;

    // Tìm người dùng bằng username hoặc gmail đã đăng kí
    const user = await Users.findOne({
      $or: [{ username: username }, { gmail: username }],
    }).exec();

    if (!user) throw createError.NotFound("User not registered");

    // Check if the user is banned
    if (user.isBan) {
      return res.status(403).json({ message: "User is banned" }); // 403 Forbidden
    }

    // Kiểm tra mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      throw createError.Unauthorized(
        "Tên người dùng, gmail hoặc mật khẩu không đúng"
      );

    // Tạo access token và refresh token
    const accessToken = await signAccessToken(user._id);
    const refreshToken = await signRefreshToken(user._id);

    // Trả về phản hồi
    res.status(200).json({
      username: user.username,
      accessToken,
      refreshToken,
      id: user._id,
      fullname: user.fullname,
      role: user.role,
      firstLogin: user.firstLogin,
    });
  } catch (error) {
    next(error);
  }
});

usersRouter.delete("/logout", async (req, res, next) => {
  res.send("Đường dẫn Đăng xuất");
});
usersRouter.post("/refresh-token", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      throw createError.BadRequest("Refresh token không hợp lệ");
    const userId = await verifyRefreshToken(refreshToken);
    if (userId) {
      const accessToken = await signAccessToken(userId);
      const newRefreshToken = await signRefreshToken(userId);
      res.send({ accessToken, refreshToken: newRefreshToken });
    }
  } catch (error) {
    next(error);
  }
});
usersRouter.put("/:id", userController.updateUser);

usersRouter.get("/:id", async (req, res, next) => {
  const { id } = req.params;
  try {
    const user = await Users.findById(id)
      .populate({
        path: "bankAccounts",
        select: "bank accountNumber",
        populate: {
          path: "bank",
          select: "bankName",
        },
      })
      .populate({
        path: "defaultBankAccount",
        select: "bank accountNumber",
        populate: {
          path: "bank",
          select: "bankName",
        },
      })
      .populate("needs")
      .exec();

    if (!user) {
      return res.status(404).json({ message: "User ID not found" });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

usersRouter.post("/reset-password/:id/:token", (req, res) => {
  const { id, token } = req.params;
  const { password } = req.body;

  jwt.verify(token, "jwt_secret_key", (err, decoded) => {
    if (err) {
      return res.json({ Status: "Error with token" });
    } else {
      bcrypt
        .hash(password, 10)
        .then((hash) => {
          Users.findByIdAndUpdate({ _id: id }, { password: hash })
            .then((u) => res.send({ Status: "Success" }))
            .catch((err) => res.send({ Status: err }));
        })
        .catch((err) => res.send({ Status: err }));
    }
  });
});
// Ban user from account
usersRouter.put("/ban/:id", async (req, res, next) => {
  const { id } = req.params;
  const data = req.body;
  try {
    const updatedUser = await Users.findOneAndUpdate({ _id: id }, data, {
      new: true,
    }).exec();

    if (!updatedUser) {
      throw createError(404, "User not found");
    }

    res.send(updatedUser);
  } catch (error) {
    next(error);
  }
});

export default usersRouter;

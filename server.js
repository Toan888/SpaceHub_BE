import cors from "cors";
import * as dotenv from "dotenv";
import express from "express";
import { json } from "express"; // Import json từ express
import connectDB from "./database.js";
import cron from "node-cron";

import {
  userRouter,
  spaceRouter,
  rulesRouter,
  categoriesRouter,
  reviewRouter,
  cartRouter,
  bookingRouter,
  bankRouter,
  bankAccountRouter,
  appliancesRouter,
  reportRouter,
  reasonsRouter,
  userNeedRouter,
  chatRouter,
  messRouter,
  communityStandardsRouter,
  notificationsRouter,
  systemPropertiesRouter
} from "./routes/index.js";
import { Server } from "socket.io"; // Import socket.io
import { createServer } from "http"; // Import createServer cho việc khởi tạo HTTP server
import { initSocket } from "./helpers/socket.io.js";
import { transactionRouter } from "./routes/transaction.js";
import { refundOwnerSpace } from "./job/RefundOwnerSpace.js";
import { dashboardRouter } from "./routes/dashboard.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(json());

app.get("/", (req, res) => {
  res.send("<h1>Welcome to the API</h1>");
});

// Đăng ký các router
app.use("/reviews", reviewRouter);
app.use("/carts", cartRouter);
app.use("/users", userRouter);
app.use("/spaces", spaceRouter);
app.use("/rules", rulesRouter);
app.use("/categories", categoriesRouter);
app.use("/bookings", bookingRouter);
app.use("/bank", bankRouter);
app.use("/bankaccount", bankAccountRouter);
app.use("/appliances", appliancesRouter);
app.use("/reports", reportRouter);
app.use("/reasons", reasonsRouter);
app.use("/userNeed", userNeedRouter);
app.use("/chat", chatRouter);
app.use("/message", messRouter);
app.use("/communityStandards", communityStandardsRouter);
app.use("/notification", notificationsRouter)
app.use("/transaction", transactionRouter)
app.use("/dashboard", dashboardRouter)
app.use("/system", systemPropertiesRouter);

app.get("/transaction", (req,res) => {
  const partnerCode = "MOMO";
  const accessKey = "F8BBA842ECF85";
  const secretkey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";
  const requestId = partnerCode + new Date().getTime();
  const orderId = requestId;
  const orderInfo = "pay with MoMo";
  const redirectUrl = "https://momo.vn/return";
  const ipnUrl = "https://callback.url/notify";
  const amount = "50000";
  const requestType = "captureWallet";
  const extraData = ""; // Pass empty value if no additional data

  // Generate the raw signature string
  const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
  console.log("RAW SIGNATURE:", rawSignature);

  // Generate the HMAC SHA256 signature
  const signature = crypto.createHmac('sha256', secretkey)
      .update(rawSignature)
      .digest('hex');
  console.log("SIGNATURE:", signature);

  // Create the request payload
  const requestBody = JSON.stringify({
      partnerCode: partnerCode,
      accessKey: accessKey,
      requestId: requestId,
      amount: amount,
      orderId: orderId,
      orderInfo: orderInfo,
      redirectUrl: redirectUrl,
      ipnUrl: ipnUrl,
      extraData: extraData,
      requestType: requestType,
      signature: signature,
      lang: 'en'
  });

  axios.post('https://test-payment.momo.vn/v2/gateway/api/create', requestBody, {
    headers: {
        'Content-Type': 'application/json'
    }
})
.then(response => {
    console.log(`Status: ${response.status}`);
    console.log('Body:', response.data);
    console.log('payUrl:', response.data.payUrl); // Access the payUrl in the response
})
.catch(error => {
    console.error(`Problem with request: ${error.message}`);
});
})

// Middleware để xử lý CORS headers
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.use((err, req, res, next) => {
  // const errorMessage = err.message;
  const errorMessage = err.message || "Internal Server Error";
  const statusCode = err.statusCode || 500;
  const stack = err.stack;

  res
    .status(statusCode)
    .json({ message: errorMessage, error: errorMessage, statusCode, stack });
});

const Port = process.env.PORT || 9999;

// Tạo HTTP server từ Express app
const server = createServer(app);

// Thiết lập Socket.io sử dụng HTTP server
const io = new initSocket(server, {
  cors: {
    // origin: "http://localhost:3000", // Allow frontend từ localhost:3000
    origin: "https://spacehub.site/",
  },
});

let activeUsers = [];

// Thiết lập các sự kiện của Socket.io
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Khi có người dùng mới thêm vào
  socket.on("new-user-add", (newUserId) => {
    try {
      // Kiểm tra xem user đã tồn tại chưa
      if (!activeUsers.some((user) => user.userId === newUserId)) {
        activeUsers.push({ userId: newUserId, socketId: socket.id });
        console.log("New User Connected", activeUsers);
      }
      io.emit("get-users", activeUsers);
    } catch (error) {
      console.error("Error adding new user:", error);
    }
  });

  // Khi người dùng ngắt kết nối
  socket.on("disconnect", () => {
    activeUsers = activeUsers.filter((user) => user.socketId !== socket.id);
    io.emit("get-users", activeUsers);
    console.log("User Disconnected", activeUsers);
  });

  // Khi nhận được yêu cầu gửi tin nhắn
  socket.on("send-message", (data) => {
    try {
      const { receiverId } = data;
      const user = activeUsers.find((user) => user.userId === receiverId);
      console.log("Sending from socket to:", receiverId);
      console.log("Data:", data);
      if (user) {
        io.to(user.socketId).emit("receive-message", data);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  });
});

// Bắt đầu server và kết nối với cơ sở dữ liệu
server.listen(Port, async () => {
  try {
    await connectDB();
    console.log(`Web server running on http://localhost:${Port}`);
  } catch (error) {
    console.error("Database connection failed", error);
  }
});

cron.schedule("*/3 * * * *", refundOwnerSpace.plusHour)


cron.schedule("*/5 * * * *", refundOwnerSpace.plusDay)

cron.schedule("0 0 * * 3", refundOwnerSpace.plusWeek);

cron.schedule("0 0 1,8,15,22 * *", refundOwnerSpace.plusMonth);
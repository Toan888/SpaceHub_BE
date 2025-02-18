import express from "express";
import sinon from 'sinon';
import { expect } from 'chai';
import request from "supertest";
import bankRouter from "../routes/bank.js";
import Bank from '../models/bank.js';

const app = express();
app.use(express.json());
app.use("/bank", bankRouter);

describe("GET /bank", () => {
  let findStub;

  beforeEach(() => {
    // Mock phương thức find của Mongoose
    findStub = sinon.stub(Bank, "find");
  });

  afterEach(() => {
    // Khôi phục lại các stub sau mỗi test case
    sinon.restore();
  });

  it("should return all bank accounts", async () => {
    const mockBanks = [
      { _id: "1", bank: { name: "Bank A" }, user: { name: "User A" } },
      { _id: "2", bank: { name: "Bank B" }, user: { name: "User B" } }
    ];

    // Mock phương thức find để trả về dữ liệu giả
    findStub.returns(mockBanks);

    const res = await request(app).get("/bank");

    // Kiểm tra xem phương thức find có được gọi hay không và đối số tìm kiếm có đúng không
    expect(findStub.calledOnce).to.be.true;
    expect(res.status).to.equal(200);
    expect(res.body).to.deep.equal(mockBanks);
  });

  it("should return 404 if no bank accounts are found", async () => {
    // Mock phương thức find để trả về mảng rỗng
    findStub.returns([]);

    const res = await request(app).get("/bank");

    // Kiểm tra xem response có mã lỗi 404 và thông báo chính xác không
    expect(res.status).to.equal(404);
    expect(res.body).to.have.property("message").that.equals("Bank not found");
  });

  it("should return 500 if there is a server error", async () => {
    // Giả lập lỗi server khi gọi phương thức find
    findStub.throws(new Error("Server Error"));
  
    const res = await request(app).get("/bank");
  
    // Kiểm tra mã lỗi 500 và thông báo lỗi
    expect(res.status).to.equal(500);
    expect(res.body).to.have.property('message').that.equals("Server Error"); // Đảm bảo kiểm tra message
  });
  
});
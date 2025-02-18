import express from "express";
import sinon from "sinon";
import { expect } from "chai";
import request from "supertest";
import BankAccount from "../models/bankAccounts.js";
import bankAccountRouter from "../routes/bankAccount.js";
import Users from "../models/users.js";
const app = express();
app.use(express.json());
app.use("/bankaccount", bankAccountRouter);
describe("Bank Account  Tests", () => {
    describe("GET /bankaccount", () => {
        let findStub;
        beforeEach(() => {
            // Mock phương thức find của Mongoose
            findStub = sinon.stub(BankAccount, "find");
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
            // Mock find và populate
            findStub.returns({
                populate: sinon.stub().returnsThis(),
                exec: sinon.stub().returns(Promise.resolve(mockBanks))
            });
            const res = await request(app).get("/bankaccount");
            // Kiểm tra xem phương thức find có được gọi hay không và đối số tìm kiếm có đúng không
            expect(findStub.calledOnce).to.be.true;
            expect(res.status).to.equal(200);
            expect(res.body).to.deep.equal(mockBanks);
        });
        it("should return 404 if no bank accounts are found", async () => {
            // Mock phương thức find để trả về mảng rỗng
            findStub.returns({
                populate: sinon.stub().returnsThis(),
                exec: sinon.stub().returns(Promise.resolve([]))
            });
            const res = await request(app).get("/bankaccount");
            // Kiểm tra xem response có mã lỗi 404 và thông báo chính xác không
            expect(res.status).to.equal(404);
            expect(res.body).to.have.property("message").that.equals("Bank accounts not found");
        });
        it("should return 500 if there is a server error", async () => {
            // Giả lập lỗi server khi gọi phương thức find
            findStub.throws(new Error("Server Error"));
            const res = await request(app).get("/bankaccount");
            // Kiểm tra mã lỗi 500 và thông báo lỗi
            expect(res.status).to.equal(500);
            expect(res.body).to.have.property("message").that.equals("Lỗi server");
        });
    });

    describe("GET /bankaccount/:userId", () => {
        let findStub;
        beforeEach(() => {
            // Mock phương thức find của Mongoose
            findStub = sinon.stub(BankAccount, "find");
        });
        afterEach(() => {
            // Khôi phục lại các stub sau mỗi test case
            sinon.restore();
        });
        it("should return bank accounts for the user with populated data", async () => {
            const mockUserId = "user123";
            const mockBankAccounts = [
                {
                    _id: "1",
                    bank: { name: "Bank A" },
                    user: { _id: mockUserId, name: "User A" },
                },
                {
                    _id: "2",
                    bank: { name: "Bank B" },
                    user: { _id: mockUserId, name: "User A" },
                },
            ];
            // Mock find và populate
            findStub.returns({
                populate: sinon.stub().returnsThis(), // Giả lập populate
                exec: sinon.stub().returns(Promise.resolve(mockBankAccounts)) // Giả lập exec trả về dữ liệu mock
            });
            const res = await request(app).get(`/bankaccount/${mockUserId}`);
            // Kiểm tra xem phương thức find có được gọi đúng với userId
            expect(findStub.calledOnceWith({ user: mockUserId })).to.be.true;
            expect(res.status).to.equal(200);
            expect(res.body).to.deep.equal(mockBankAccounts);
        });
        it("should return 404 if no bank accounts are found for the user", async () => {
            const mockUserId = "user123";
            // Mock find để trả về mảng rỗng
            findStub.returns({
                populate: sinon.stub().returnsThis(),
                exec: sinon.stub().returns(Promise.resolve([]))
            });
            const res = await request(app).get(`/bankaccount/${mockUserId}`);
            // Kiểm tra mã lỗi 404 và thông báo chính xác
            expect(res.status).to.equal(404);
            expect(res.body).to.have.property("message").that.equals("Không tìm thấy tài khoản ngân hàng cho người dùng này");
        });
        it("should return 500 if there is a server error", async () => {
            const mockUserId = "user123";
            // Giả lập lỗi server khi gọi phương thức find
            findStub.throws(new Error("Server Error"));
            const res = await request(app).get(`/bankaccount/${mockUserId}`);
            // Kiểm tra mã lỗi 500 và thông báo lỗi
            expect(res.status).to.equal(500);
            expect(res.body).to.have.property("message").that.equals("Lỗi server");
        });
    });
    describe("POST /bankaccount", () => {
        let findOneStub;
        let saveStub;
        let findByIdStub;
        beforeEach(() => {
            // Mock phương thức findOne của Mongoose để kiểm tra tài khoản ngân hàng đã tồn tại
            findOneStub = sinon.stub(BankAccount, "findOne");
            // Mock phương thức save của Mongoose
            saveStub = sinon.stub(BankAccount.prototype, "save");
            // Mock phương thức findById của Users
            findByIdStub = sinon.stub(Users, "findById");
        });
        afterEach(() => {
            // Khôi phục lại các stub sau mỗi test case
            sinon.restore();
        });
        it("should return 400 if required fields are missing", async () => {
            const res = await request(app)
                .post("/bankaccount")
                .send({}); // Không gửi thông tin bắt buộc
            expect(res.status).to.equal(400);
            expect(res.body).to.have.property("message").that.equals("Thiếu trường bắt buộc trong yêu cầu");
        });
        it("should return 400 if the bank account already exists", async () => {
            const mockBankAccount = { bank: "Bank A", accountNumber: "12345" };
            // Giả lập BankAccount.findOne trả về một tài khoản ngân hàng đã tồn tại
            findOneStub.returns({
                exec: sinon.stub().resolves(mockBankAccount)
            });
            const res = await request(app)
                .post("/bankaccount")
                .send({ user: "user123", bank: "Bank A", accountNumber: "12345" });
            expect(res.status).to.equal(400); // Kiểm tra mã lỗi 400
            expect(res.body).to.have.property("message").that.equals("Tài khoản ngân hàng đã tồn tại");
        });

        it("should return 500 if there is a server error", async () => {
            // Giả lập lỗi server trong findOne
            findOneStub.throws(new Error("Server Error"));
            const res = await request(app)
                .post("/bankaccount")
                .send({ user: "user123", bank: "Bank A", accountNumber: "12345" });
            expect(res.status).to.equal(500); // Kiểm tra mã lỗi 500 khi có lỗi trong server
            expect(res.body).to.have.property("message").that.equals("Lỗi server");
        });
    });
    describe("PUT /:accountId", () => {
        let findByIdStub, saveStub;

        beforeEach(() => {
            // Stub phương thức findById và save của BankAccount
            findByIdStub = sinon.stub(BankAccount, "findById");
            saveStub = sinon.stub(BankAccount.prototype, "save");
        });

        afterEach(() => {
            // Khôi phục stub sau mỗi test case
            sinon.restore();
        });


        it("should return 404 if the bank account is not found", async () => {
            const accountId = "nonexistent123";
            findByIdStub.resolves(null); // Giả lập không tìm thấy tài khoản ngân hàng

            const res = await request(app)
                .put(`/bankaccount/${accountId}`)
                .send({ bank: "Updated Bank" });

            expect(res.status).to.equal(404);
            expect(res.body).to.have.property("message").that.equals("Tài khoản ngân hàng không tìm thấy");
        });

        it("should return 500 if there is a server error", async () => {
            const accountId = "error123";

            // Giả lập lỗi server trong BankAccount.findById
            findByIdStub.throws(new Error("Server error"));

            const res = await request(app)
                .put(`/bankaccount/${accountId}`)
                .send({ bank: "Updated Bank" });

            expect(res.status).to.equal(500);
            expect(res.body).to.have.property("message").that.equals("Lỗi server");
            expect(res.body).to.have.property("error");
        });
    });
    describe("DELETE /:accountId", () => {
        let findByIdAndDeleteStub, findByIdStub, saveStub;
      
        beforeEach(() => {
          // Stub phương thức của BankAccount và Users
          findByIdAndDeleteStub = sinon.stub(BankAccount, "findByIdAndDelete");
          findByIdStub = sinon.stub(Users, "findById");
          saveStub = sinon.stub(Users.prototype, "save");
        });
      
        afterEach(() => {
          // Khôi phục stub sau mỗi test case
          sinon.restore();
        });
      
      
        it("should return 404 if the bank account is not found", async () => {
          const accountId = "nonexistent123";
      
          // Mock BankAccount.findByIdAndDelete trả về null (không tìm thấy)
          findByIdAndDeleteStub.resolves(null);
      
          const res = await request(app).delete(`/bankaccount/${accountId}`);
      
          expect(res.status).to.equal(404);
          expect(res.body).to.have.property("message").that.equals("Tài khoản ngân hàng không tìm thấy");
        });
      
        it("should handle server errors", async () => {
          const accountId = "error123";
      
          // Giả lập lỗi server trong BankAccount.findByIdAndDelete
          findByIdAndDeleteStub.throws(new Error("Server error"));
      
          const res = await request(app).delete(`/bankaccount/${accountId}`);
      
          expect(res.status).to.equal(500);
          expect(res.body).to.have.property("message").that.equals("Lỗi server");
          expect(res.body).to.have.property("error");
        });
      
        it("should handle user not found when removing accountId", async () => {
          const accountId = "123456";
          const mockBankAccount = { _id: accountId, user: "user123" };
      
          // Mock BankAccount.findByIdAndDelete trả về tài khoản ngân hàng giả lập
          findByIdAndDeleteStub.resolves(mockBankAccount);
      
          // Mock Users.findById trả về null (người dùng không tìm thấy)
          findByIdStub.resolves(null);
      
          const res = await request(app).delete(`/bankaccount/${accountId}`);
      
          expect(res.status).to.equal(200);
          expect(res.body).to.have.property("message").that.equals("Tài khoản ngân hàng đã được xóa thành công");
          expect(res.body.bankAccount).to.deep.equal(mockBankAccount);
        });
      });
})
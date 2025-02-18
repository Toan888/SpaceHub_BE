import bcrypt from "bcrypt";
import { expect } from 'chai';
import nodemailer from "nodemailer";
import sinon from 'sinon';
import userController from "../controllers/users.js";
import { userDao } from "../dao/index.js";
import Users from "../models/users.js";


describe("User Controller Tests", () => {

  let req, res, sandbox;

  beforeEach(() => {

    req = {
      params: {},
      body: {},
    };
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
      send: sinon.stub(),
    };
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("getAllUsers", () => {
    it("should return all users with status 200", async () => {
      const mockUsers = [{ id: 1, username: "testuser" }];
      sandbox.stub(userDao, "fetchAllUsers").resolves(mockUsers);

      await userController.getAllUsers(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith(mockUsers)).to.be.true;
    });

    it("should handle errors and return status 500", async () => {
      sandbox.stub(userDao, "fetchAllUsers").rejects(new Error("Database error"));

      await userController.getAllUsers(req, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ error: "Error: Database error" })).to.be.true;
    });
  });

  describe("getUserByUserName", () => {
    it("should return user by username with status 200", async () => {
      const mockUser = { id: 1, username: "testuser" };
      req.params.username = "testuser";
      sandbox.stub(userDao, "fetchUserByUsername").resolves(mockUser);

      await userController.getUserByUserName(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith(mockUser)).to.be.true;
    });

    it("should handle errors and return status 500", async () => {
      req.params.username = "testuser";
      sandbox.stub(userDao, "fetchUserByUsername").rejects(new Error("Database error"));

      await userController.getUserByUserName(req, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ error: "Error: Database error" })).to.be.true;
    });
  });

  describe("updateUser", () => {
    it("should update user and return status 200", async () => {
      const mockUpdatedUser = { id: "123", name: "Updated User" };
      req.params.id = "123";
      req.body = { name: "Updated User" };
  
      sandbox.stub(userDao, "updateUser").resolves(mockUpdatedUser);
  
      await userController.updateUser(req, res);
  
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith(mockUpdatedUser)).to.be.true;
    });
    it("should return 404 if user is not found", async () => {
      req.params.id = "123";
      req.body = { name: "Updated User" };
  
      // Giả lập không tìm thấy người dùng
      sandbox.stub(userDao, "updateUser").resolves(null);
  
      await userController.updateUser(req, res);
  
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledWith({ message: "User not found" })).to.be.true;
    });
  
    it("should return 400 if no data is provided for update", async () => {
      req.params.id = "123";
      req.body = {}; // Không có dữ liệu để cập nhật
  
      // Giả lập thành công mặc dù không có gì để cập nhật
      sandbox.stub(userDao, "updateUser").resolves(null);
  
      await userController.updateUser(req, res);
  
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ message: "No data provided for update" })).to.be.true;
    });
  
    it("should handle errors and return status 500", async () => {
      req.params.id = "123";
      req.body = { name: "Updated User" };
  
      sandbox.stub(userDao, "updateUser").rejects(new Error("Database error"));
  
      await userController.updateUser(req, res);
  
      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ error: "Error: Database error" })).to.be.true;
    });
  });
  

  describe("forgetPass", () => {
    it("should send reset email successfully", async () => {
      req.body.gmail = "test@example.com";
      const mockUser = { _id: "123", fullname: "Test User" };

      sandbox.stub(userDao, "forgotPass").resolves(mockUser);
      const sendMailStub = sinon.stub().yields(null, "Email sent");
      sandbox.stub(nodemailer, "createTransport").returns({ sendMail: sendMailStub });

      await userController.forgetPass(req, res);

      expect(res.send.calledWith({ Status: "Thành công" })).to.be.true;
    });
    it("should handle error during sending email", async () => {
        req.body.gmail = "test@example.com";
        const mockUser = { _id: "123", fullname: "Test User" };
      
        sandbox.stub(userDao, "forgotPass").resolves(mockUser);
        
        const sendMailStub = sinon.stub().yields(new Error("Lỗi khi gửi mail"));
        sandbox.stub(nodemailer, "createTransport").returns({ sendMail: sendMailStub });
      
        await userController.forgetPass(req, res);
        expect(res.send.calledWith({ Status: "Lỗi khi gửi mail" })).to.be.true;
      });
      
    it("should return error if user not found", async () => {
      req.body.gmail = "test@example.com";
      sandbox.stub(userDao, "forgotPass").resolves(null);

      await userController.forgetPass(req, res);

      expect(res.send.calledWith({ Status: "Không thành công", Error: "Người dùng không tồn tại" })).to.be.true;
    });
  });

  describe('uploadImages', () => {
    let findByIdAndUpdateStub;
    
    beforeEach(() => {
      // Mock phương thức findByIdAndUpdate của Users
      findByIdAndUpdateStub = sinon.stub(Users, 'findByIdAndUpdate');
    });
  
    afterEach(() => {
      // Restore lại các stub sau khi mỗi test case
      sinon.restore();
    });
  
    it('should return 400 if no file uploaded', async () => {
      const req = {
        file: null,  // Không có file
        body: { userId: 'userId123' }
      };
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub()
      };
  
      await userController.uploadImages(req, res);
  
      expect(res.status.calledOnceWith(400)).to.be.true;
      expect(res.json.calledOnceWith({ message: 'No file uploaded' })).to.be.true;
    });
  
    it('should upload image and return the image details with 200 status', async () => {
      const mockImage = {
        url: 'path/to/uploaded/image.jpg',
        public_id: 'file123'
      };
  
      const req = {
        file: { path: mockImage.url, filename: mockImage.public_id },
        body: { userId: 'userId123' }
      };
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub()
      };
  
      findByIdAndUpdateStub.resolves();  // Mock thành công khi cập nhật thông tin người dùng
  
      await userController.uploadImages(req, res);
  
      expect(findByIdAndUpdateStub.calledOnceWith('userId123', { avatar: mockImage.url }, { new: true })).to.be.true;
      expect(res.status.calledOnceWith(200)).to.be.true;
      expect(res.json.calledOnceWith({
        message: 'Images uploaded successfully',
        images: mockImage
      })).to.be.true;
    });
  
    it('should return 500 if an error occurs during image upload', async () => {
      const req = {
        file: { path: 'path/to/image.jpg', filename: 'file123' },
        body: { userId: 'userId123' }
      };
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub()
      };
  
      // Giả lập lỗi trong quá trình cập nhật người dùng
      findByIdAndUpdateStub.rejects(new Error('Database error'));
  
      await userController.uploadImages(req, res);
  
      expect(res.status.calledOnceWith(500)).to.be.true;
      expect(res.json.calledOnceWith({ message: 'Server error', error: 'Database error' })).to.be.true;
    });
  });
  
});

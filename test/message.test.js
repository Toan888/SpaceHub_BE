import { expect } from "chai";
import sinon from "sinon";
import messageController from "../controllers/message.js";
import { messageDao, spaceDao } from "../dao/index.js";
import Spaces from "../models/spaces.js";
import Users from "../models/users.js";
import MessageModel from "../models/messageModel.js";
import MessageController from "../controllers/MessageController.js";


describe("Message Controller-Tests", () => {
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

    describe("sendMessage", () => {
        let sandbox, req, res;
      
        beforeEach(() => {
          sandbox = sinon.createSandbox();
          req = {
            body: {
              userId: "123",
              messageContent: "Test message",
              spaceId: "456",
            },
          };
          res = {
            status: sandbox.stub().returnsThis(),
            json: sandbox.stub(),
          };
        });
      
        afterEach(() => {
          sandbox.restore();
        });
      
        it("should send message successfully and return status 201", async () => {
          const mockSpace = { userId: "789" };
          const mockUser = { _id: "123" };
          const mockReceiver = { _id: "789" };
          const mockMessage = {
            userId: "123",
            receiverId: "789",
            messageContent: "Test message",
            spaceId: "456",
          };
      
          sandbox.stub(Spaces, "findById").withArgs("456").resolves(mockSpace);
          
          // Single stub with a fake implementation
          sandbox.stub(Users, "findById").callsFake((id) => {
            if (id === "123") return Promise.resolve(mockUser);
            if (id === "789") return Promise.resolve(mockReceiver);
            return Promise.resolve(null);
          });
      
          sandbox.stub(messageDao, "sendMessage").resolves(mockMessage);
          
          await messageController.sendMessage(req, res);
          
          expect(res.status.calledWith(201)).to.be.true;
          expect(res.json.calledWith({ message: "Tin nhắn đã được gửi", data: mockMessage })).to.be.true;
      });
      
        
      
        it("should return 400 if space does not exist", async () => {
          sandbox.stub(Spaces, "findById").resolves(null); // Mô phỏng không gian không tồn tại
      
          await messageController.sendMessage(req, res);
      
          expect(res.status.calledWith(400)).to.be.true;
          expect(res.json.calledWith({ message: "Không gian không tồn tại" })).to.be.true;
        });
      
        it("should return 400 if user or receiver does not exist", async () => {
          const mockSpace = { userId: "789" }; // Đối tượng mô phỏng không gian
      
          sandbox.stub(Spaces, "findById").resolves(mockSpace);
          sandbox.stub(Users, "findById").resolves(null); // Mô phỏng người dùng không tồn tại
      
          await messageController.sendMessage(req, res);
      
          expect(res.status.calledWith(400)).to.be.true;
          expect(res.json.calledWith({ message: "User không tồn tại" })).to.be.true;
        });
      
        it("should handle errors and return status 500", async () => {
          sandbox.stub(Spaces, "findById").rejects(new Error("Database error")); // Giả lập lỗi cơ sở dữ liệu
      
          await messageController.sendMessage(req, res);
      
          expect(res.status.calledWith(500)).to.be.true;
          expect(res.json.calledWith({ message: "Error: Database error" })).to.be.true;
        });
      });
     
      describe("messageController.getMessagesBetweenUsers", () => {
        let sandbox, req, res;
      
        beforeEach(() => {
          sandbox = sinon.createSandbox();
          req = {
            params: {
              userId: "123",
              receiverId: "789",
              spaceId: "456",
            },
          };
          res = {
            status: sandbox.stub().returnsThis(),
            json: sandbox.stub(),
          };
        });
      
        afterEach(() => {
          sandbox.restore();
        });
      
        it("should return messages successfully and status 200", async () => {
          const mockUser = { _id: "123" };
          const mockReceiver = { _id: "789" };
          const mockMessages = [
            { userId: "123", receiverId: "789", content: "Hello!" },
            { userId: "789", receiverId: "123", content: "Hi there!" },
          ];
      
          // Stub Users.findById to return mock users
          sandbox.stub(Users, "findById")
            .withArgs("123").resolves(mockUser)
            .withArgs("789").resolves(mockReceiver);
      
          // Stub messageDao.getMessages to return mock messages
          sandbox.stub(messageDao, "getMessages").resolves(mockMessages);
      
          await messageController.getMessagesBetweenUsers(req, res);
      
          expect(res.status.calledWith(200)).to.be.true;
          expect(res.json.calledWith({ data: mockMessages })).to.be.true;
        });
      
        it("should return 400 if user or receiver does not exist", async () => {
          // Stub Users.findById to return null for receiver
          sandbox.stub(Users, "findById")
            .withArgs("123").resolves({ _id: "123" })
            .withArgs("789").resolves(null);
      
          await messageController.getMessagesBetweenUsers(req, res);
      
          expect(res.status.calledWith(400)).to.be.true;
          expect(res.json.calledWith({ message: "User hoặc Receiver không tồn tại" })).to.be.true;
        });
      
        it("should return 404 if no messages are found", async () => {
          const mockUser = { _id: "123" };
          const mockReceiver = { _id: "789" };
      
          // Stub Users.findById to return mock users
          sandbox.stub(Users, "findById")
            .withArgs("123").resolves(mockUser)
            .withArgs("789").resolves(mockReceiver);
      
          // Stub messageDao.getMessages to return an empty array
          sandbox.stub(messageDao, "getMessages").resolves([]);
      
          await messageController.getMessagesBetweenUsers(req, res);
      
          expect(res.status.calledWith(404)).to.be.true;
          expect(res.json.calledWith({ message: "Không có tin nhắn nào giữa hai người" })).to.be.true;
        });
      
        it("should return 500 if an error occurs", async () => {
          // Stub Users.findById to throw an error
          sandbox.stub(Users, "findById").throws(new Error("Database error"));
      
          await messageController.getMessagesBetweenUsers(req, res);
      
          expect(res.status.calledWith(500)).to.be.true;
          expect(res.json.calledWith({ message: "Database error" })).to.be.true;
        });
      });
      
      describe("addMessage", () => {
        let req, res, sandbox;
      
        beforeEach(() => {
          sandbox = sinon.createSandbox();
          req = {
            body: {
              chatId: "123",
              senderId: "456",
              text: "Hello, world!",
            },
          };
          res = {
            status: sandbox.stub().returnsThis(),
            json: sandbox.stub(),
          };
        });
      
        afterEach(() => {
          sandbox.restore();
        });
      
        it("should save a message and return status 200 with the result", async () => {
          const mockMessage = {
            chatId: "123",
            senderId: "456",
            text: "Hello, world!",
            _id: "789",
            createdAt: new Date(),
            updatedAt: new Date(),
          };
      
          // Stub MessageModel's save method
          sandbox.stub(MessageModel.prototype, "save").resolves(mockMessage);
      
          await MessageController.addMessage(req, res);
      
          expect(res.status.calledWith(200)).to.be.true;
          expect(res.json.calledWith(mockMessage)).to.be.true;
        });
      
        it("should return status 500 if an error occurs during saving", async () => {
          // Stub MessageModel's save method to throw an error
          sandbox.stub(MessageModel.prototype, "save").rejects(new Error("Database error"));
      
          await MessageController.addMessage(req, res);
      
          expect(res.status.calledWith(500)).to.be.true;
          expect(res.json.calledWith(sinon.match({ message: sinon.match.string }))).to.be.true;
        });
      });
      
      describe("getMessages", () => {
        let req, res, sandbox;
      
        beforeEach(() => {
          sandbox = sinon.createSandbox();
          req = {
            params: {
              chatId: "123", // Giá trị chatId giả lập
            },
          };
          res = {
            status: sandbox.stub().returnsThis(),
            json: sandbox.stub(),
          };
        });
      
        afterEach(() => {
          sandbox.restore();
        });
      
        it("should return messages and status 200 if messages exist", async () => {
          const mockMessages = [
            { chatId: "123", senderId: "456", text: "Hello!" },
            { chatId: "123", senderId: "789", text: "Hi there!" },
          ];
      
          sandbox.stub(MessageModel, "find").resolves(mockMessages);
      
          await MessageController.getMessages(req, res);
      
          expect(res.status.calledWith(200)).to.be.true;
          expect(res.json.calledWith(mockMessages)).to.be.true;
        });
      
        it("should return status 400 if chatId is missing", async () => {
          req.params.chatId = undefined; // Không có `chatId`
      
          await MessageController.getMessages(req, res);
      
          expect(res.status.calledWith(400)).to.be.true;
          expect(res.json.calledWith({ message: "Chat ID không hợp lệ" })).to.be.true;
        });
      
        it("should return status 404 if chatId is invalid", async () => {
          sandbox.stub(MessageModel, "find").resolves(null); // Không tìm thấy dữ liệu
      
          await MessageController.getMessages(req, res);
      
          expect(res.status.calledWith(404)).to.be.true;
          expect(res.json.calledWith({ message: "Không tìm thấy tin nhắn nào" })).to.be.true;
        });
      
        it("should return status 500 if an error occurs during fetching", async () => {
          sandbox.stub(MessageModel, "find").rejects(new Error("Database error"));
      
          await MessageController.getMessages(req, res);
      
          expect(res.status.calledWith(500)).to.be.true;
          expect(res.json.calledWith(sinon.match({ message: sinon.match.string }))).to.be.true;
        });
      });


      
})
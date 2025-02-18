import sinon from "sinon";
import spaceController from "../controllers/spaces.js";
import { notificationDao, spaceDao, userDao } from "../dao/index.js";
import Spaces from "../models/spaces.js";
import cloudinary from "../cloudinary.config.js";
import express from 'express';
import Users from "../models/users.js";
import CommunityStandards from "../models/communityStandards.js";
import mongoose from "mongoose";
import spacesRouter from "../routes/spaces.js";
import request from "supertest";
import { expect } from 'chai';
import { userController } from "../controllers/index.js";


describe("Space Controller-Tests", () => {
  let req, res, sandbox

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

  describe("getAllSpacesApply", () => {
    it("should return all users with status 200", async () => {
      const mockSpaces = [
        { id: 1, name: 'Space 1', censorship: "Chấp nhận" },
        { id: 2, name: 'Space 2', censorship: "Chấp nhận" },
      ];
      sandbox.stub(spaceDao, "fetchAllSpacesApply").resolves(mockSpaces);

      await spaceController.getAllSpacesApply(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith(mockSpaces)).to.be.true;
    });

    it("should handle errors and return status 500", async () => {
      sandbox.stub(spaceDao, "fetchAllSpacesApply").rejects(new Error("Database error"));

      await spaceController.getAllSpacesApply(req, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ error: "Error: Database error" })).to.be.true;
    });
  });

  describe("getAllSpaces", () => {

    it("should return all users with status 200", async () => {
      const mockSpaces = [
        { id: 1, name: 'Space 1' },
        { id: 2, name: 'Space 2' },
      ];
      sandbox.stub(spaceDao, "fetchAllSpaces").resolves(mockSpaces);

      await spaceController.getAllSpaces(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith(mockSpaces)).to.be.true;
    });

    it("should handle errors and return status 500", async () => {
      sandbox.stub(spaceDao, "fetchAllSpaces").rejects(new Error("Database error"));

      await spaceController.getAllSpaces(req, res);

      // test xem api có trả về lỗi hay không
      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ error: "Error: Database error" })).to.be.true;
    });
  });

  describe("changeFavoriteStatus", () => {
    let sandbox;
    let req, res;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      req = { params: { id: "672de180a29a7d1dcce3b7a9" } };
      res = {
        status: sandbox.stub().returnsThis(),
        json: sandbox.stub(),
      };

      // Mock các phương thức trong spacesDAO
      sandbox.stub(spaceDao, "getSpaceById");
      sandbox.stub(spaceDao, "updateFavoriteStatus");
    });

    afterEach(() => {
      sandbox.restore();
    });

    const mockSpace = {
      _id: "672de180a29a7d1dcce3b7a9",
      favorite: false,
      save: async () => {
        return this;
      },
    };

    it("should change the favorite status successfully and return status 200", async () => {
      // Mock getSpaceById và updateFavoriteStatus
      spaceDao.getSpaceById.resolves(mockSpace);
      spaceDao.updateFavoriteStatus.resolves({
        ...mockSpace,
        favorite: !mockSpace.favorite,
      });

      await spaceController.changeFavoriteStatus(req, res);

      // Kiểm tra kết quả trả về
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith({
        message: "Đã thay đổi trạng thái yêu thích thành công",
        favorite: true,
      })).to.be.true;
    });

    it("should return status 404 if the space does not exist", async () => {
      // Mock khi không tìm thấy không gian
      spaceDao.getSpaceById.resolves(null);

      await spaceController.changeFavoriteStatus(req, res);

      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledWith({ message: "Không gian không tồn tại" })).to.be.true;
    });

    it("should return status 500 on internal server error", async () => {
      // Mock lỗi từ getSpaceById
      spaceDao.getSpaceById.rejects(new Error("Database error"));

      await spaceController.changeFavoriteStatus(req, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({
        message: "Lỗi hệ thống",
        error: "Database error",
      })).to.be.true;
    });
  });




  describe("getAllSpaceFavorites", () => {
    let sandbox, req, res;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      req = {};
      res = {
        status: sandbox.stub().returnsThis(),
        json: sandbox.stub(),
      };
    });

    afterEach(() => {
      sandbox.restore();
    });

    const mockSpaces = [
      {
        locationPoint: {
          type: "Point",
          coordinates: [105.77499242871824, 19.804795582985733],
        },
        _id: "672de180a29a7d1dcce3b7a9",
        name: "Phòng làm việc số mới",
        favorite: true,
      },
    ];

    it("should return all spaces with status 200", async () => {
      // Stub DAO
      sandbox.stub(spaceDao, "fetchAllSpaceFavorite").resolves(mockSpaces);

      // Gọi API
      await spaceController.getAllSpaceFavorites(req, res);

      // Kiểm tra status và kết quả trả về
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith(mockSpaces)).to.be.true;
    });

    it("should handle errors and return status 500", async () => {
      // Stub DAO để throw lỗi
      sandbox.stub(spaceDao, "fetchAllSpaceFavorite").rejects(new Error("Database error"));

      // Gọi API
      await spaceController.getAllSpaceFavorites(req, res);

      // Kiểm tra status và lỗi trả về
      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ error: "Error: Database error" })).to.be.true;
    });
  });




  describe('uploadImages', () => {
    let req, res;

    beforeEach(() => {
      req = {
        files: [
          { path: '/uploads/test1.jpg', filename: 'test1.jpg' },
          { path: '/uploads/test2.jpg', filename: 'test2.jpg' }
        ]
      };

      res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub()
      };
    });

    it('should return 200 and image details if images are uploaded successfully', async () => {
      await spaceController.uploadImages(req, res);
      expect(res.status.calledOnceWith(200)).to.be.true;
      expect(res.json.calledOnceWith({
        message: 'Images uploaded successfully',
        images: [
          { url: '/uploads/test1.jpg', public_id: 'test1.jpg' },
          { url: '/uploads/test2.jpg', public_id: 'test2.jpg' }
        ]
      })).to.be.true;
    });

  });

  describe('removeImages', () => {
    let destroyStub;

    beforeEach(() => {
      destroyStub = sinon.stub(cloudinary.uploader, 'destroy');
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should return 200 if image is deleted successfully', async () => {
      destroyStub.resolves({ result: 'ok' });

      const req = { body: { public_id: 'samplePublicId' } };
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      await spaceController.removeImages(req, res);

      expect(destroyStub.calledOnceWith('samplePublicId')).to.be.true;
      expect(res.status.calledOnceWith(200)).to.be.true;
      expect(res.json.calledOnceWith({ message: 'Image deleted successfully' })).to.be.true;
    });

    it('should return 400 if image deletion fails', async () => {
      destroyStub.resolves({ result: 'not found' });

      const req = { body: { public_id: 'samplePublicId' } };
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      await spaceController.removeImages(req, res);

      expect(destroyStub.calledOnceWith('samplePublicId')).to.be.true;
      expect(res.status.calledOnceWith(400)).to.be.true;
      expect(res.json.calledOnceWith({
        message: 'Failed to delete image',
        result: { result: 'not found' },
      })).to.be.true;
    });

    it('should return 500 if an error occurs', async () => {
      destroyStub.rejects(new Error('Cloudinary error'));

      const req = { body: { public_id: 'samplePublicId' } };
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      await spaceController.removeImages(req, res);

      expect(destroyStub.calledOnceWith('samplePublicId')).to.be.true;
      expect(res.status.calledOnceWith(500)).to.be.true;
      expect(res.json.calledOnceWith({
        message: 'Server error',
        error: 'Cloudinary error',
      })).to.be.true;
    });
  });

  describe('deleteSpace', () => {

    beforeEach(() => {
      req = {
        params: {
          id: '672de180a29a7d1dcce3b7a9', // ID của không gian cần xóa
        },
      };
      res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };
      sandbox = sinon.createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should successfully delete space', async () => {
      // Mock phương thức deleteSpace trả về một không gian đã xóa
      sandbox.stub(spaceDao, 'deleteSpace').resolves({
        _id: '672de180a29a7d1dcce3b7a9',
        name: 'Phòng làm việc số mới',
      });

      // Gọi controller function
      await spaceController.deleteSpace(req, res);

      // Kiểm tra phản hồi trả về khi xóa thành công
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith({
        _id: '672de180a29a7d1dcce3b7a9',
        name: 'Phòng làm việc số mới',
      })).to.be.true;
    });

    it('should return error if space does not exist', async () => {
      // Mock phương thức deleteSpace khi không tìm thấy không gian
      sandbox.stub(spaceDao, 'deleteSpace').resolves(null);

      // Gọi controller function
      await spaceController.deleteSpace(req, res);

      // Kiểm tra phản hồi khi không tìm thấy không gian để xóa
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledWith({
        message: 'Space not found',
      })).to.be.true;
    });


    it('should return error if there is a server issue', async () => {
      // Giả sử có lỗi khi gọi deleteSpace
      sandbox.stub(spaceDao, 'deleteSpace').rejects(new Error('Server error'));


      // Gọi controller function
      await spaceController.deleteSpace(req, res);

      // Kiểm tra phản hồi khi có lỗi server
      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({
        error: 'Server error',
      })).to.be.true;
    });

  });

  describe('similarSpace', () => {
    let sandbox, req, res;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      req = {
        params: { id: '12345' },  // Giả lập tham số id
      };
      res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should return similar spaces when found', async () => {
      // Giả lập dữ liệu trả về từ fetchSimilarSpaces
      const mockSpaces = [{ id: 1, name: 'Test Space', categoriesId: '12345' }];

      // Stub phương thức fetchSimilarSpaces từ DAO
      sandbox.stub(spaceDao, 'fetchSimilarSpaces').resolves(mockSpaces);

      // Gọi controller
      await spaceController.getSimilarSpaces(req, res);

      // Kiểm tra status và dữ liệu trả về
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith(mockSpaces)).to.be.true;
    });

    it('should return 400 if no similar spaces are found', async () => {
      // Giả lập trường hợp không tìm thấy không gian tương tự
      sandbox.stub(spaceDao, 'fetchSimilarSpaces').resolves([]);

      // Gọi controller
      await spaceController.getSimilarSpaces(req, res);

      // Kiểm tra status và thông báo lỗi
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ message: 'not found' })).to.be.true;
    });

    it('should return 500 if there is a server error', async () => {
      // Giả lập lỗi trong quá trình gọi fetchSimilarSpaces
      sandbox.stub(spaceDao, 'fetchSimilarSpaces').rejects(new Error('Database error'));

      // Gọi controller
      await spaceController.getSimilarSpaces(req, res);

      // Kiểm tra lỗi trả về
      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ message: 'Error: Database error' })).to.be.true;
    });
  });

  describe("getProposedSpaces", () => {
    let req, res, sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      req = { params: { userId: "123" } };
      res = {
        status: sandbox.stub().returnsThis(),
        json: sandbox.stub(),
      };
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("should return 404 if userId is not provided", async () => {
      req.params.userId = null;

      await spaceController.getProposedSpaces(req, res);

      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledWith({ message: "UserId is required" })).to.be.true;
    });

    it("should return 404 if userNeed is not found", async () => {
      sandbox.stub(spaceDao, "getUserNeedByUserId").resolves(null);

      await spaceController.getProposedSpaces(req, res);

      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledWith({ message: "Not found user need" })).to.be.true;
    });

    it("should return empty data if firstLogin is false", async () => {
      sandbox.stub(spaceDao, "getUserNeedByUserId").resolves({
        userId: { firstLogin: false },
      });

      await spaceController.getProposedSpaces(req, res);

      expect(res.json.calledWith({ message: "This is not first login", data: [] })).to.be.true;
    });

    it("should return spaces based on user preferences", async () => {
      const mockPreferences = ["category1", "category2"];
      const mockSpaces = [{ id: 1, name: "Space 1" }, { id: 2, name: "Space 2" }];

      sandbox.stub(spaceDao, "getUserNeedByUserId").resolves({
        userId: { firstLogin: true },
        productPreferences: mockPreferences,
      });
      sandbox.stub(spaceDao, "getSpacesByPreferences").resolves(mockSpaces);
      sandbox.stub(spaceDao, "updateFirstLoginStatus").resolves();

      await spaceController.getProposedSpaces(req, res);

      expect(res.json.calledWith({
        message: "Get proposed spaces successfully",
        data: mockSpaces,
      })).to.be.true;
    });

    it("should return the first 5 spaces if no preferences are set", async () => {
      const mockSpaces = [{ id: 1, name: "Space 1" }, { id: 2, name: "Space 2" }];

      sandbox.stub(spaceDao, "getUserNeedByUserId").resolves({
        userId: { firstLogin: true },
        productPreferences: null,
      });
      sandbox.stub(spaceDao, "getFirst5Spaces").resolves(mockSpaces);
      sandbox.stub(spaceDao, "updateFirstLoginStatus").resolves();

      await spaceController.getProposedSpaces(req, res);

      expect(res.json.calledWith({
        message: "Get proposed spaces successfully",
        data: mockSpaces,
      })).to.be.true;
    });

    it("should handle errors and return status 500", async () => {
      sandbox.stub(spaceDao, "getUserNeedByUserId").rejects(new Error("Database error"));

      await spaceController.getProposedSpaces(req, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ message: "Get user needs failed" })).to.be.true;
    });
  });

  describe("getBookingDetailsSpaces", () => {
    let req, res, sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      req = { params: { userId: "123" } };
      res = {
        status: sandbox.stub().returnsThis(),
        json: sandbox.stub(),
      };
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("should return space with booking info successfully", async () => {
      const mockSpaces = [
        { _id: "1", name: "Space 1" },
        { _id: "2", name: "Space 2" },
      ];
      const mockBookings = [
        { createdAt: "2024-11-01", plusTransId: "trans1" },
        { createdAt: "2024-11-02", plusTransId: "trans2" },
      ];

      sandbox.stub(spaceDao, "getSpacesByUserId").resolves(mockSpaces);
      sandbox.stub(spaceDao, "getBookingsBySpaceId").resolves(mockBookings);

      await spaceController.getBookingDetailsSpaces(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith({
        message: "Get space with booking info successfully",
        data: [
          { _id: "1", name: "Space 1", bookings: mockBookings },
          { _id: "2", name: "Space 2", bookings: mockBookings },
        ],
      })).to.be.true;
    });

    it("should handle missing userId and return 404", async () => {
      req.params.userId = null;

      await spaceController.getBookingDetailsSpaces(req, res);

      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledWith({ message: "All field is required" })).to.be.true;
    });

    it("should handle errors and return status 500", async () => {
      sandbox.stub(spaceDao, "getSpacesByUserId").rejects(new Error("Database error"));

      await spaceController.getBookingDetailsSpaces(req, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ message: "Get space with booking info failed" })).to.be.true;
    });
  });


  describe("createNewSpace", () => {
    let req, res, next, sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      req = {
        body: {
          name: "Test Space",
          description: "A lovely space for events",
          location: "Some Location",
          area: 100,
          rulesId: "rulesId",
          userId: "userId",
          pricePerHour: 20,
          pricePerDay: 100,
          pricePerWeek: 500,
          pricePerMonth: 2000,
          images: [{ public_id: "img1", url: "http://example.com/img1" }],
          censorship: false,
          status: "active",
          categoriesId: "categoryId",
          appliancesId: ["applianceId1", "applianceId2"],
          reportCount: 0,
          isGoldenHour: false,
          goldenHourDetails: {},
          favorite: false,
          latLng: [10.123456, 106.123456],
        },
      };
      res = {
        status: sandbox.stub().returnsThis(),
        json: sandbox.stub(),
      };
      next = sandbox.stub(); // Middleware for error handling
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("should create a new space successfully", async () => {
      const mockCommunityStandards = {
        _id: new mongoose.Types.ObjectId(), // Correctly instantiate ObjectId
        reasons: [],
        customReason: [],
      };
      const mockNewSpace = {
        _id: new mongoose.Types.ObjectId(), // Correctly instantiate ObjectId
        name: req.body.name,
      };

      sandbox.stub(CommunityStandards.prototype, "save").resolves(mockCommunityStandards);
      sandbox.stub(Spaces, "create").resolves(mockNewSpace);
      sandbox.stub(Users, "find").resolves([{ _id: "adminId", role: 1 }]);
      sandbox.stub(Users, "findById").resolves({ fullname: "Admin User" });
      sandbox.stub(notificationDao, "saveAndSendNotification").resolves();

      await spaceController.createNewSpace(req, res, next);

      expect(res.status.calledWith(201)).to.be.true;
      expect(res.json.calledWith({ success: true, space: mockNewSpace })).to.be.true;

      // Check if notification was sent
      expect(notificationDao.saveAndSendNotification.calledOnce).to.be.true;
    });

    it("should return 400 if required fields are missing", async () => {
      delete req.body.name; // Removing required field

      await spaceController.createNewSpace(req, res, next);

      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({
        success: false,
        message: 'Missing required fields',
      })).to.be.true;
    });

    it("should handle errors gracefully", async () => {
      sandbox.stub(CommunityStandards.prototype, "save").throws(new Error("Database error"));

      await spaceController.createNewSpace(req, res, next);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ success: false, message: "Error creating space: Database error" })).to.be.true;
    });
  });

  const app = express();
  app.use(express.json());
  app.use("/spaces", spacesRouter);
  describe("GET /search/:name", () => {
    let findStub;

    beforeEach(() => {
      // Stub phương thức find của mô hình Spaces
      findStub = sinon.stub(Spaces, "find");
    });

    afterEach(() => {
      // Khôi phục các stub sau mỗi test case
      sinon.restore();
    });

    it("Tìm thấy không gian với tên tương ứng", async () => {
      const mockSearchResult = [
        { _id: new mongoose.Types.ObjectId(), name: "Test Space", description: "Test space description" },
      ];

      // Giả lập phương thức find trả về kết quả tìm kiếm
      findStub.resolves(mockSearchResult);

      const res = await request(app).get("/spaces/search/Test Space");

      // Kiểm tra kết quả trả về
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an("array");
      expect(res.body[0]).to.have.property("name", "Test Space");
      expect(res.body[0]).to.have.property("description", "Test space description");
    });

    it("Xử lý lỗi server khi có lỗi cơ sở dữ liệu", async () => {
      // Giả lập lỗi cơ sở dữ liệu khi gọi find
      findStub.rejects(new Error("Database error"));

      const res = await request(app).get("/spaces/search/AnySpace");

      // Kiểm tra kết quả trả về
      expect(res.status).to.equal(500);
      expect(res.body).to.have.property("message", "Internal Server Error");
    });
  });

  describe("GET /compare-spaces-differences", () => {
    let findByIdStub;

    beforeEach(() => {
      // Stub phương thức findById của Mongoose trước mỗi test
      findByIdStub = sinon.stub(Spaces, "findById");
    });

    afterEach(() => {
      // Khôi phục phương thức sau mỗi test
      findByIdStub.restore();
    });

    it("Tìm thấy hai sản phẩm và có sự khác biệt", async () => {
      const space1 = { _id: "spaceId1", name: "Space A", location: "Location 1", pricePerHour: 100, pricePerDay: 200, pricePerMonth: 300, status: "available", images: ["image1.jpg"] };
      const space2 = { _id: "spaceId2", name: "Space B", location: "Location 2", pricePerHour: 150, pricePerDay: 250, pricePerMonth: 350, status: "unavailable", images: ["image2.jpg"] };

      // Giả lập phương thức findById trả về dữ liệu
      findByIdStub.onCall(0).resolves(space1);
      findByIdStub.onCall(1).resolves(space2);

      const res = await request(app).get("/spaces/compare-spaces-differences?id1=spaceId1&id2=spaceId2");

      expect(res.status).to.equal(200); // Kiểm tra mã trạng thái là 200
      expect(res.body).to.have.property("name");
      expect(res.body.name.space1).to.equal("Space A");
      expect(res.body.name.space2).to.equal("Space B");
      expect(res.body).to.have.property("location");
      expect(res.body.location.space1).to.equal("Location 1");
      expect(res.body.location.space2).to.equal("Location 2");
      expect(res.body).to.have.property("pricePerHour");
      expect(res.body.pricePerHour.space1).to.equal(100);
      expect(res.body.pricePerHour.space2).to.equal(150);
    });

    it("Không tìm thấy một hoặc cả hai sản phẩm", async () => {
      // Giả lập phương thức findById trả về null cho một sản phẩm
      findByIdStub.onCall(0).resolves(null);
      findByIdStub.onCall(1).resolves({ _id: "spaceId2" });

      const res = await request(app).get("/spaces/compare-spaces-differences?id1=spaceId1&id2=spaceId2");

      expect(res.status).to.equal(404); // Kiểm tra mã trạng thái là 404
      expect(res.body).to.have.property("message", "Không tìm thấy một hoặc cả hai sản phẩm");
    });

    it("Hai sản phẩm giống nhau", async () => {
      const space1 = { _id: "spaceId1", name: "Space A", location: "Location 1", pricePerHour: 100, pricePerDay: 200, pricePerMonth: 300, status: "available", images: ["image1.jpg"] };
      const space2 = { _id: "spaceId2", name: "Space A", location: "Location 1", pricePerHour: 100, pricePerDay: 200, pricePerMonth: 300, status: "available", images: ["image1.jpg"] };

      // Giả lập phương thức findById trả về dữ liệu giống nhau
      findByIdStub.onCall(0).resolves(space1);
      findByIdStub.onCall(1).resolves(space2);

      const res = await request(app).get("/spaces/compare-spaces-differences?id1=spaceId1&id2=spaceId2");

      expect(res.status).to.equal(200); // Kiểm tra mã trạng thái là 200

      // Kiểm tra nếu không có sự khác biệt
      if (Object.keys(res.body).includes('message')) {
        expect(res.body.message).to.equal("Hai sản phẩm giống nhau");
      } else {
        // Kiểm tra nếu có sự khác biệt, chẳng hạn so với hình ảnh
        expect(res.body).to.have.property('images');
        expect(res.body.images).to.have.property('space1', "image1.jpg");
        expect(res.body.images).to.have.property('space2', "image1.jpg");
      }

    });

    it("Xử lý lỗi server khi có lỗi cơ sở dữ liệu", async () => {
      // Giả lập lỗi trong quá trình truy vấn
      findByIdStub.onCall(0).throws(new Error("Database error"));

      const res = await request(app).get("/spaces/compare-spaces-differences?id1=spaceId1&id2=spaceId2");

      expect(res.status).to.equal(500); // Kiểm tra mã trạng thái là 500
      expect(res.body).to.have.property("message", "Đã xảy ra lỗi khi so sánh sản phẩm");
    });
  });

  describe('GET /compare-spaces', () => {
    let findByIdStub;

    beforeEach(() => {
      // Tạo stub cho phương thức findById
      findByIdStub = sinon.stub(Spaces, 'findById');
    });

    afterEach(() => {
      // Khôi phục phương thức sau khi kiểm tra
      findByIdStub.restore();
    });

    it('Tìm thấy cả hai sản phẩm, trả về thông tin so sánh', async () => {
      const space1 = {
        _id: 'spaceId1',
        name: 'Space A',
        location: 'Location A',
        area: 100,
        pricePerHour: 50,
        pricePerDay: 100,
        pricePerMonth: 1000,
        status: 'available',
        latLng: { lat: 10, lng: 20 },
        images: ['image1.jpg'],
      };

      const space2 = {
        _id: 'spaceId2',
        name: 'Space B',
        location: 'Location B',
        area: 150,
        pricePerHour: 60,
        pricePerDay: 120,
        pricePerMonth: 1200,
        status: 'available',
        latLng: { lat: 15, lng: 25 },
        images: ['image2.jpg'],
      };

      // Giả lập phương thức findById trả về dữ liệu sản phẩm
      findByIdStub.onCall(0).resolves(space1);
      findByIdStub.onCall(1).resolves(space2);

      const res = await request(app).get('/spaces/compare-spaces?id1=spaceId1&id2=spaceId2');

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('space1');
      expect(res.body).to.have.property('space2');
      expect(res.body.space1.name).to.equal('Space A');
      expect(res.body.space2.name).to.equal('Space B');
    });

    it('Không tìm thấy một trong hai sản phẩm, trả về mã lỗi 404', async () => {
      findByIdStub.onCall(0).resolves(null); // Giả lập không tìm thấy space1
      findByIdStub.onCall(1).resolves({
        _id: 'spaceId2',
        name: 'Space B',
        location: 'Location B',
        area: 150,
        pricePerHour: 60,
        pricePerDay: 120,
        pricePerMonth: 1200,
        status: 'available',
        latLng: { lat: 15, lng: 25 },
        images: ['image2.jpg'],
      });

      const res = await request(app).get('/spaces/compare-spaces?id1=spaceId1&id2=spaceId2');

      expect(res.status).to.equal(404);
      expect(res.body).to.have.property('message', 'Không tìm thấy một hoặc cả hai sản phẩm');
    });

    it('Xử lý lỗi hệ thống, trả về mã lỗi 500', async () => {
      findByIdStub.throws(new Error('Database error'));

      const res = await request(app).get('/spaces/compare-spaces?id1=spaceId1&id2=spaceId2');

      expect(res.status).to.equal(500);
      expect(res.body).to.have.property('message', 'Đã xảy ra lỗi khi so sánh sản phẩm');
    });
  });

  describe('GET /:id', () => {
    let findByIdStub;

    beforeEach(() => {
      // Giả lập phương thức findById, populate và exec
      findByIdStub = sinon.stub(Spaces, 'findById');
    });

    afterEach(() => {
      // Khôi phục lại phương thức sau mỗi test
      findByIdStub.restore();
    });

    it('Tìm thấy không gian, trả về thông tin không gian với populate và exec', async () => {
      const mockSpace = {
        _id: 'spaceId1',
        name: 'Space A',
        location: 'Location A',
        area: 100,
        pricePerHour: 50,
        pricePerDay: 100,
        pricePerMonth: 1000,
        status: 'available',
        latLng: { lat: 10, lng: 20 },
        images: ['image1.jpg'],
        userId: 'userId1',
        rulesId: ['ruleId1'],
        appliancesId: ['applianceId1'],
        categoriesId: ['categoryId1'],
        communityStandardsId: ['standardId1'],
      };

      // Giả lập findById trả về đối tượng với populate và exec
      findByIdStub.returns({
        populate: sinon.stub().returnsThis(),
        exec: sinon.stub().returns(Promise.resolve(mockSpace)),
      });

      const res = await request(app).get('/spaces/spaceId1');

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('name', 'Space A');
      expect(res.body).to.have.property('location', 'Location A');
      expect(res.body).to.have.property('status', 'available');
    });

    it('Không tìm thấy không gian, trả về mã lỗi 404', async () => {
      // Giả lập findById trả về null (không tìm thấy không gian)
      findByIdStub.returns({
        populate: sinon.stub().returnsThis(),
        exec: sinon.stub().returns(Promise.resolve(null)),
      });

      const res = await request(app).get('/spaces/spaceId1');

      expect(res.status).to.equal(404);
      expect(res.body).to.have.property('message', 'Space not found');
    });

    it('Xử lý lỗi hệ thống, trả về mã lỗi 500', async () => {
      // Giả lập findById trả về lỗi cơ sở dữ liệu
      findByIdStub.returns({
        populate: sinon.stub().returnsThis(),
        exec: sinon.stub().returns(Promise.reject(new Error('Database error'))),
      });

      const res = await request(app).get('/spaces/spaceId1');

      expect(res.status).to.equal(500);
      expect(res.body).to.have.property('message', 'Đã xảy ra lỗi khi lấy sản phẩm');
    });
  });

  describe(" GET /for/:id", () => {
    let findStub;

    beforeEach(() => {
      // Mô phỏng phương thức find của Spaces
      findStub = sinon.stub(Spaces, "find");
    });

    afterEach(() => {
      // Khôi phục phương thức stub sau mỗi test case
      findStub.restore();
    });

    it("should return 200 and space data when spaces are found for a given userId", async () => {
      const mockSpaces = [
        { name: "Space 1", userId: "user123" },
        { name: "Space 2", userId: "user123" }
      ];

      findStub.returns({
        populate: sinon.stub().returnsThis(),
        exec: sinon.stub().returns(Promise.resolve(mockSpaces))
      });

      const res = await request(app)
        .get("/spaces/for/user123")
        .expect(200);

      expect(res.body).to.deep.equal(mockSpaces);
    });

    it("should return 404 and error message when no spaces are found for a given userId", async () => {
      findStub.returns({
        populate: sinon.stub().returnsThis(),
        exec: sinon.stub().returns(Promise.resolve(null)),
      });

      const res = await request(app)
        .get("/spaces/for/user123")
        .expect(404);

      expect(res.body.message).to.equal("Space not found");
    });

    it("should return 500 and error message when there is a server error", async () => {
      findStub.returns({
        populate: sinon.stub().returnsThis(),
        exec: sinon.stub().returns(Promise.reject(new Error("Database error")))  // Lỗi server
      });

      const res = await request(app)
        .get("/spaces/for/user123")
        .expect(500);

      expect(res.body.message).to.equal("Đã xảy ra lỗi khi lấy thông tin ");
    });
  });

  describe("PUT /update/:postId", () => {
    let findOneAndUpdateStub, saveAndSendNotificationStub;

    beforeEach(() => {
      // Mô phỏng phương thức findOneAndUpdate của Spaces
      findOneAndUpdateStub = sinon.stub(Spaces, "findOneAndUpdate");
      saveAndSendNotificationStub = sinon.stub(notificationDao, "saveAndSendNotification");
    });

    afterEach(() => {
      // Khôi phục các stub sau mỗi test case
      findOneAndUpdateStub.restore();
      saveAndSendNotificationStub.restore();
    });

    it("should return 200 and the updated post when post is found and updated", async () => {
      const mockPost = {
        _id: "123456",
        name: "Test Space",
        userId: "user123",
        censorship: "Chấp nhận",
        images: [{ url: "http://image.url" }],
      };

      findOneAndUpdateStub.returns(Promise.resolve(mockPost));

      const res = await request(app)
        .put("/spaces/update/123456")
        .send({ censorship: "Chấp nhận" })
        .expect(200);

      expect(res.body.censorship).to.equal("Chấp nhận");
      expect(saveAndSendNotificationStub.calledOnce).to.be.true;
    });

    it("should return 404 and error message when post is not found", async () => {
      findOneAndUpdateStub.returns(Promise.resolve(null));

      const res = await request(app)
        .put("/spaces/update/123456")
        .send({ censorship: "Từ chối" })
        .expect(404);

      expect(res.body.message).to.equal("PostSpace not found");
      expect(saveAndSendNotificationStub.called).to.be.false;
    });

    it("should return 500 and error message when there is a server error", async () => {
      findOneAndUpdateStub.returns((new Error("Database error")));

      const res = await request(app)
        .put("/spaces/update/123456")
        .send({ censorship: "Chấp nhận" })
        .expect(500);

      expect(res.body.message).to.equal("Đã xảy ra lỗi khi chấp nhận post");
      expect(saveAndSendNotificationStub.called).to.be.false;
    });
  });

  describe("get All Userrs", () => {
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
});

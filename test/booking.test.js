import bookingController from "../controllers/bookings.js";
import { BookingDAO, notificationDao } from "../dao/index.js";
import bcrypt from "bcrypt";
import { expect } from 'chai';
import sinon from 'sinon';
import Bookings from "../models/bookings.js";
import { transactionDao } from "../dao/transactionDao.js";
import Users from "../models/users.js";
import bookingRouter from "../routes/bookings.js";
import express from "express";
import request from "supertest";

describe("Booking Test", () => {

  describe("checkHourAvailability", () => {
    let req, res, sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      req = {
        body: {
          spaceId: "123",
          dates: ["2024-12-01", "2024-12-02"],
          rentalType: "hour",
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

    it("should return available slots with status 200", async () => {
      const mockBookings = [
        {
          rentalType: "hour",
          selectedSlots: [
            { date: "2024-12-01", startTime: "08:00", endTime: "09:00" },
          ],
        },
      ];

      sandbox.stub(BookingDAO, "getBookingsBySpaceAndDates").resolves(mockBookings);

      await bookingController.checkHourAvailability(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith(sinon.match.has("availableSlots"))).to.be.true;
    });

    it("should return taken dates with status 200 for day rental type", async () => {
      req.body.rentalType = "day";
      const mockBookings = [
        {
          rentalType: "day",
          selectedDates: ["2024-12-01T00:00:00.000Z"],
        },
      ];

      sandbox.stub(BookingDAO, "getBookingsBySpaceAndDates").resolves(mockBookings);

      await bookingController.checkHourAvailability(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(
        res.json.calledWith({
          isAvailable: false,
          takenDates: sinon.match.array,
        })
      ).to.be.true;
    });

    it("should return status 500 if BookingDAO throws an error", async () => {
      sandbox.stub(BookingDAO, "getBookingsBySpaceAndDates").rejects(new Error("Database error"));

      await bookingController.checkHourAvailability(req, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(
        res.json.calledWith({
          message: sinon.match.string.and(sinon.match(/Database error/)),
        })
      ).to.be.true;
    });

    it("should handle invalid date formats in the request body", async () => {
      req.body.dates = ["invalid-date"];
      await bookingController.checkHourAvailability(req, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(
        res.json.calledWith({
          message: sinon.match.string.and(sinon.match(/Invalid date format/)),
        })
      ).to.be.true;
    });



  });

  describe("checkDayAvailability", () => {
    let req, res, sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();

      // Mock request and response objects
      req = {
        body: {
          spaceId: "test-space-id",
          dates: ["2024-12-01", "2024-12-02", "2024-12-03"],
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

    it("should return all days as available when there are no bookings", async () => {
      sandbox.stub(BookingDAO, "getBookingsBySpaceAndDates").resolves([]);

      await bookingController.checkDayAvailability(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const expectedResponse = {
        availableSlots: [
          { date: "Sun Dec 01 2024", isAvailable: true },
          { date: "Mon Dec 02 2024", isAvailable: true },
          { date: "Tue Dec 03 2024", isAvailable: true },
        ],
      };

      expect(res.json.calledWith(expectedResponse)).to.be.true;
    });

    it("should return some days as unavailable when bookings exist", async () => {
      const mockBookings = [
        {
          selectedSlots: [{ date: "2024-12-01" }],
        },
      ];

      sandbox.stub(BookingDAO, "getBookingsBySpaceAndDates").resolves(mockBookings);

      await bookingController.checkDayAvailability(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const expectedResponse = {
        availableSlots: [
          { date: "Sun Dec 01 2024", isAvailable: false },
          { date: "Mon Dec 02 2024", isAvailable: true },
          { date: "Tue Dec 03 2024", isAvailable: true },
        ],
      };

      expect(res.json.calledWith(expectedResponse)).to.be.true;
    });

    it("should handle invalid date formats in the request", async () => {
      req.body.dates = ["invalid-date", "2024-12-02"];

      await bookingController.checkDayAvailability(req, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(
        res.json.calledWithMatch({
          message: sinon.match("Invalid date format"),
        })
      ).to.be.true;
    });

    it("should handle errors from the DAO layer gracefully", async () => {
      sandbox.stub(BookingDAO, "getBookingsBySpaceAndDates").throws(new Error("Database error"));

      await bookingController.checkDayAvailability(req, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(
        res.json.calledWithMatch({
          message: sinon.match("Database error"),
        })
      ).to.be.true;
    });
  });

  describe('getListBookingOfUser', () => {
    let fetchListBookingOfUserStub;

    beforeEach(() => {
      fetchListBookingOfUserStub = sinon.stub(BookingDAO, 'fetchListBookingOfUser');
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should return booking list and status 200 when bookings are found', async () => {
      const fakeBookingList = [
        {
          _id: 'bookingId123',
          userId: 'userId123',
          items: [{ spaceId: 'spaceId123' }],
          isAllowCancel: true,
        },
      ];

      fetchListBookingOfUserStub.resolves(fakeBookingList);

      const req = { params: { id: 'userId123' } };
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      await bookingController.getListBookingOfUser(req, res);

      expect(fetchListBookingOfUserStub.calledOnceWith('userId123')).to.be.true;
      expect(res.status.calledOnceWith(200)).to.be.true;
      expect(res.json.calledOnceWith(fakeBookingList)).to.be.true;
    });

    it('should return 404 if no bookings are found', async () => {
      fetchListBookingOfUserStub.resolves([]);

      const req = { params: { id: 'userId123' } };
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      await bookingController.getListBookingOfUser(req, res);

      expect(fetchListBookingOfUserStub.calledOnceWith('userId123')).to.be.true;
      expect(res.status.calledOnceWith(404)).to.be.true;
      expect(res.json.calledOnceWith('Not Found')).to.be.true;
    });

    it('should return 500 if an error occurs during fetching bookings', async () => {
      fetchListBookingOfUserStub.rejects(new Error('Database error'));

      const req = { params: { id: 'userId123' } };
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      await bookingController.getListBookingOfUser(req, res);

      expect(fetchListBookingOfUserStub.calledOnceWith('userId123')).to.be.true;
      expect(res.status.calledOnceWith(500)).to.be.true;
      expect(res.json.calledWith({ message: "Error: Database error" })).to.be.true;
    });

    it('should return booking list with populated spaceId', async () => {
      const fakeBookingList = [
        {
          _id: 'bookingId123',
          userId: 'userId123',
          items: [{ spaceId: 'spaceId123' }],
          isAllowCancel: true,
        },
      ];

      fetchListBookingOfUserStub.resolves(fakeBookingList);

      const req = { params: { id: 'userId123' } };
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      await bookingController.getListBookingOfUser(req, res);

      expect(fetchListBookingOfUserStub.calledOnceWith('userId123')).to.be.true;
      expect(res.status.calledOnceWith(200)).to.be.true;
      expect(res.json.calledOnceWith(fakeBookingList)).to.be.true;
    });

    it('should return an empty array if there are no bookings for the user', async () => {
      fetchListBookingOfUserStub.resolves([]);

      const req = { params: { id: 'userId456' } };
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      await bookingController.getListBookingOfUser(req, res);

      expect(fetchListBookingOfUserStub.calledOnceWith('userId456')).to.be.true;
      expect(res.status.calledOnceWith(404)).to.be.true;
      expect(res.json.calledOnceWith('Not Found')).to.be.true;
    });
  });

  const app = express();
  app.use(express.json());
  app.use("/bookings", bookingRouter);
  describe("GET /bookings", () => {
    let findStub;
  
    beforeEach(() => {
      // Mock phương thức find của Mongoose
      findStub = sinon.stub(Bookings, "find");
    });
  
    afterEach(() => {
      // Khôi phục lại các stub sau mỗi test case
      sinon.restore();
    });
  
    it("should return all bookings with populated fields", async () => {
      // Dữ liệu giả lập để trả về
      const mockBookings = [
        {
          _id: "booking1",
          spaceId: { _id: "space1", name: "Space A" },
          userId: { _id: "user1", name: "User A" },
        },
        {
          _id: "booking2",
          spaceId: { _id: "space2", name: "Space B" },
          userId: { _id: "user2", name: "User B" },
        },
      ];
  
      // Giả lập find() trả về mockBookings
      findStub.returns({
        populate: sinon.stub().returnsThis(),
        exec: sinon.stub().resolves(mockBookings),
      });
  
      const res = await request(app).get("/bookings");
  
      expect(res.status).to.equal(200); // Kiểm tra mã trạng thái HTTP
      expect(res.body).to.be.an("array").that.has.lengthOf(2);
      expect(res.body[0]).to.have.property("spaceId").that.has.property("name", "Space A");
      expect(res.body[0]).to.have.property("userId").that.has.property("name", "User A");
    });
  
    it("should return 404 if no bookings are found", async () => {
      // Giả lập find() trả về mảng rỗng
      findStub.returns({
        populate: sinon.stub().returnsThis(),
        exec: sinon.stub().resolves([]),
      });
  
      const res = await request(app).get("/bookings");
  
      expect(res.status).to.equal(404); // Kiểm tra mã trạng thái HTTP
      expect(res.body).to.have.property("message", "Không tìm thấy dịch vụ");
    });
  
    it("should return 500 if there is a server error", async () => {
      // Giả lập lỗi khi gọi find()
      findStub.throws(new Error("Lỗi server"));
  
      const res = await request(app).get("/bookings");
  
      expect(res.status).to.equal(500); // Kiểm tra mã trạng thái HTTP
      expect(res.body).to.have.property("message", "Lỗi server");
    });
  });

  describe("PUT /update-status/:id", () => {
    let findByIdAndUpdateStub, transactionStub;

    beforeEach(() => {
      // Stub các phương thức cần thiết
      findByIdAndUpdateStub = sinon.stub(Bookings, "findByIdAndUpdate");
      transactionStub = sinon.stub(transactionDao, "transferMoneyBooking");
    });

    afterEach(() => {
      // Khôi phục lại các stub sau mỗi test case
      sinon.restore();
    });

  
    it("Trả về 400 nếu trạng thái không hợp lệ", async () => {
      const res = await request(app)
        .put("/bookings/update-status/mockBookingId")
        .send({ status: "invalid_status" });

      expect(res.status).to.equal(400);
      expect(res.body.message).to.equal("Invalid status value");
    });


    it("Trả về 500 nếu có lỗi server", async () => {
      // Giả lập lỗi khi gọi findByIdAndUpdate
      findByIdAndUpdateStub.throws(new Error("Lỗi server"));

      const res = await request(app)
        .put("/bookings/update-status/mockBookingId")
        .send({ status: "completed" });

      expect(res.status).to.equal(500);
      expect(res.body).to.have.property("message", "Lỗi server");
    });
  });

})

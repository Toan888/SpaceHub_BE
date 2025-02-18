import reviewController from "../controllers/reviews.js";
import { notificationDao, reviewDao } from "../dao/index.js";
import { expect } from 'chai';
import sinon from 'sinon';
import Bookings from "../models/bookings.js";
import Spaces from "../models/spaces.js";
import Reviews from "../models/reviews.js";
import Users from "../models/users.js";

describe("Review Controller-Tests", () => {
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

  describe("getReviewBySId", () => {
    let req, res, sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      req = {
        params: {
          id: "spaceId123", // ID của không gian cần lấy đánh giá
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

    it("should return reviews and status 200", async () => {
      const mockReviews = [
        { _id: "reviewId123", spaceId: "spaceId123", userId: { name: "User 1" }, content: "Great space!" },
        { _id: "reviewId124", spaceId: "spaceId123", userId: { name: "User 2" }, content: "Nice experience!" },
      ];

      sandbox.stub(reviewDao, "fetchReviewBySId").resolves(mockReviews);

      await reviewController.getReviewBySId(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith(mockReviews)).to.be.true;
    });

    it("should return status 404 when no reviews are found", async () => {
      sandbox.stub(reviewDao, "fetchReviewBySId").resolves(null);

      await reviewController.getReviewBySId(req, res);

      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledWith({ message: "Not found review" })).to.be.true;
    });

    it("should handle errors and return status 500", async () => {
      sandbox.stub(reviewDao, "fetchReviewBySId").rejects(new Error("Database error"));

      await reviewController.getReviewBySId(req, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ message: "Error: Database error" })).to.be.true;
    });
  });

  describe("deleteReviewBySId", () => {
    let req, res, sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      req = {
        params: {
          id: "reviewId123", // ID của review cần xóa
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

    it("should delete the review and return status 200", async () => {
      const mockDeleteResult = { deletedCount: 1 }; // Giả lập kết quả xóa thành công

      sandbox.stub(reviewDao, "deleteReviewBySId").resolves(mockDeleteResult);

      await reviewController.deleteReviewBySId(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith({ message: "Review deleted successfully" })).to.be.true;
    });

    it("should return status 404 when no review is found to delete", async () => {
      const mockDeleteResult = { deletedCount: 0 }; // Giả lập không tìm thấy review để xóa

      // Stub dao để trả về mockDeleteResult
      sandbox.stub(reviewDao, "deleteReviewBySId").resolves(mockDeleteResult);

      // Gọi controller
      await reviewController.deleteReviewBySId(req, res);

      // Kiểm tra xem mã trạng thái là 404 và thông báo "Not found review" có được trả về không
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledWith({ message: "Not found review" })).to.be.true;
    });


    it("should handle errors and return status 500", async () => {
      sandbox.stub(reviewDao, "deleteReviewBySId").rejects(new Error("Database error"));

      await reviewController.deleteReviewBySId(req, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ message: "Error: Database error" })).to.be.true;
    });


  });
  describe("editReviewBySId", () => {
    let req, res, sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      req = {
        params: { id: "reviewId123" },
        body: { rating: 4, comment: "Updated review comment" },
      };
      res = {
        status: sandbox.stub().returnsThis(),
        json: sandbox.stub(),
      };
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("should return status 200 and success message when review is edited successfully", async () => {
      const mockEditResult = {
        _id: "reviewId123",
        rating: 4,
        comment: "Updated review comment",
      };

      sandbox.stub(reviewDao, "editReviewBySId").resolves(mockEditResult);

      await reviewController.editReviewBySId(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith({ message: "Review edited successfully" })).to.be.true;
    });

    it("should return status 404 when review is not found", async () => {
      sandbox.stub(reviewDao, "editReviewBySId").resolves(null);

      await reviewController.editReviewBySId(req, res);

      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledWith({ message: "Not found review" })).to.be.true;
    });

    it("should return status 500 when an error occurs", async () => {
      sandbox.stub(reviewDao, "editReviewBySId").rejects(new Error("Database error"));

      await reviewController.editReviewBySId(req, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ message: "Error: Database error" })).to.be.true;
    });
  });


  describe("addReplyToReview", () => {
    let req, res, sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      req = {
        params: { id: "reviewId123" },
        body: {
          text: "This is a reply",
          userId: "userId456",
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

    it("should add a reply to the review and return status 200", async () => {
      const mockUpdatedReview = {
        _id: "reviewId123",
        replies: [
          { text: "This is a reply", userId: "userId456" },
        ],
      };

      sandbox.stub(reviewDao, "addReplyToReview").resolves(mockUpdatedReview);

      await reviewController.addReplyToReview(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(
        res.json.calledWith({
          message: "Reply added successfully",
          updatedReview: mockUpdatedReview,
        })
      ).to.be.true;
    });

    it("should return status 404 when the review is not found", async () => {
      sandbox.stub(reviewDao, "addReplyToReview").resolves(null);

      await reviewController.addReplyToReview(req, res);

      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledWith({ message: "Review not found" })).to.be.true;
    });

    it("should return status 500 when an error occurs", async () => {
      sandbox.stub(reviewDao, "addReplyToReview").rejects(new Error("Database error"));

      await reviewController.addReplyToReview(req, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ message: "Error: Database error" })).to.be.true;
    });
  });



})
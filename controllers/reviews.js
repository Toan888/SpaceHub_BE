import { reviewDao } from "../dao/index.js";
import Bookings from "../models/bookings.js";
import Reviews from "../models/reviews.js";
import Spaces from "../models/spaces.js";
import { notificationDao } from "../dao/index.js";
import Users from "../models/users.js";

const getReviewBySId = async (req, res) => {
  try {
    const review = req.params.id;
    const allReview = await reviewDao.fetchReviewBySId(review);
    if (allReview) {
      res.status(200).json(allReview);
    } else {
      res.status(404).json({ message: "Not found review" });
    }
  } catch (error) {
    res.status(500).json({ message: error.toString() });
  }
};
const deleteReviewBySId = async (req, res) => {
  try {
    const removeReview = await reviewDao.deleteReviewBySId(req.params.id);
    if (removeReview.deletedCount > 0) {
      res.status(200).json({ message: "Review deleted successfully" });
    } else {
      res.status(404).json({ message: "Not found review" });
    }
  } catch (error) {
    res.status(500).json({ message: error.toString() });
  }
};
const editReviewBySId = async (req, res) => {
  try {
    req.body;
    const editReview = await reviewDao.editReviewBySId(req.params.id, req.body);
    if (editReview) {
      res.status(200).json({ message: "Review edited successfully" });
    } else {
      res.status(404).json({ message: "Not found review" });
    }
  } catch (error) {
    res.status(500).json({ message: error.toString() });
  }
};
const createReview = async (req, res) => {
  try {
    const { text, rating, spaceId, userId } = req.body;
    if (!text || !rating || !spaceId || !userId) {
      return res.status(404).json({ message: "All field is required" });
    }
    const foundSpace = await Spaces.findById(spaceId).lean();
    if (!foundSpace) {
      return res.status(404).json({ message: "Space not found" });
    }
    const booking = await Bookings.findOne({
      userId,
      spaceId,
    }).lean();
    if (!booking) {
      return res.status(404).json({ message: "Booking space not found" });
    }
    const existingReview = await Reviews.findOne({ userId, spaceId }).lean();
    if (existingReview) {
      return res.status(400).json({ message: "Bạn đã đánh giá không gian này trước đó rồi !!!" });
    }

    const newReview = await Reviews.create({ text, rating, spaceId, userId });
    await Spaces.findByIdAndUpdate(spaceId, {
      $push: { reviews: newReview._id },
    }).lean();
    const space = await Spaces.findById(spaceId);
    const user = await Users.findById(userId);
    const notificationUrl = `/spaces/${spaceId}`;
    const userAvatar = user?.avatar || "https://cellphones.com.vn/sforum/wp-content/uploads/2023/10/avatar-trang-4.jpg";

    await notificationDao.saveAndSendNotification(
      space.userId.toString(),
      `${user?.fullname} đã đánh giá space ${space?.name}`,
      userAvatar,
      notificationUrl
    );

    res.status(201).json({ message: "review added successfully", newReview });
  } catch (error) {
    res.status(500).json({ message: error.toString() });
  }
};


const addReplyToReview = async (req, res) => {
  try {
    const reviewId = req.params.id;
    const { text, userId } = req.body;
    const replyData = { text, userId };
    const updatedReview = await reviewDao.addReplyToReview(reviewId, replyData);

    if (updatedReview) {
      res
        .status(200)
        .json({ message: "Reply added successfully", updatedReview });
    } else {
      res.status(404).json({ message: "Review not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.toString() });
  }
};

export default {
  getReviewBySId,
  deleteReviewBySId,
  editReviewBySId,
  createReview,
  addReplyToReview
}

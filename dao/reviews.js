import Reviews from "../models/reviews.js";

const fetchReviewBySId = async (id) => {
  try {
    const allReview = await Reviews.find({ spaceId: id })
      .populate("userId")
      .exec();
    return allReview;
  } catch (error) {
    throw new Error(error.toString());
  }
};
const deleteReviewBySId = async (id) => {
  try {
    const deleteReviewBySId = await Reviews.deleteOne({ _id: id }).exec();
    return deleteReviewBySId;
  } catch (error) {
    throw new Error(error.toString());
  }
};
const editReviewBySId = async (id, newData) => {
  try {
    const editReview = await Reviews.findOneAndUpdate({ _id: id }, newData, {
      new: true,
    }).exec();
    return editReview;
  } catch (error) {
    throw new Error(error.toString());
  }
};
const createReviewsBySId = async (text, rating, spaceId, userId) => {
  try {
    const createReviewsBySId = await Reviews.create({
      text,
      rating,
      spaceId,
      userId,
    });
    return createReviewsBySId;
  } catch (error) {
    throw new Error(error.toString());
  }
};
const addReplyToReview = async (id, replyData) => {

    try {
      const review = await Reviews.findById(id);
      if (review) {
        review.replies.push(replyData);
        await review.save();
        return review;
      } else {
        throw new Error("Review not found");
      }
    } catch (error) {
      throw new Error(error.toString());
    }
  };

  const createReview = async (text, rating, spaceId, userId) => {
    // Tìm Space
    const foundSpace = await Spaces.findById(spaceId).lean();
    if (!foundSpace) {
      throw new Error("Space not found");
    }
  
    // Tìm Booking
    const booking = await Bookings.findOne({ userId, spaceId }).lean();
    if (!booking) {
      throw new Error("Booking space not found");
    }
  
    // Tạo review mới
    const newReview = await Reviews.create({ text, rating, spaceId, userId });
  
    // Cập nhật danh sách review của Space
    await Spaces.findByIdAndUpdate(spaceId, { $push: { reviews: newReview._id } }).lean();
  
    // Tìm thông tin để gửi thông báo
    const space = await Spaces.findById(spaceId).lean();
    const user = await Users.findById(userId).lean();
    const notificationUrl = `/spaces/${spaceId}`;
    const userAvatar = user?.avatar || "https://cellphones.com.vn/sforum/wp-content/uploads/2023/10/avatar-trang-4.jpg";
  
    // Gửi thông báo
    const notificationResult = await notificationDao.saveAndSendNotification(
      space.userId.toString(),
      `${user?.fullname} đã đánh giá space ${space?.name}`,
      userAvatar,
      notificationUrl
    );
  
    return { newReview, notificationResult };
  };
  
export default {
  fetchReviewBySId,
  deleteReviewBySId,
  editReviewBySId,
  createReviewsBySId,
  addReplyToReview,
  createReview
};

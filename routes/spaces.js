import { spaceController } from "../controllers/index.js";
import express from "express";
import Spaces from "../models/spaces.js";
import createError from "http-errors";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../cloudinary.config.js";
import { notificationDao } from "../dao/index.js";



const spaceRouter = express.Router();

const storage = new CloudinaryStorage({
  cloudinary :cloudinary,
  allowedFormats: ['jpg', 'png','webp','jfif'],
  params:{
    folder:'spacehub/img_space'
  }
});

const uploadCloud = multer({ storage:storage });

spaceRouter.get("/", spaceController.getAllSpacesApply);
spaceRouter.get("/all", spaceController.getAllSpaces);
spaceRouter.put("/:id/favorite", spaceController.changeFavoriteStatus);
spaceRouter.get("/favorite", spaceController.getAllSpaceFavorites);
spaceRouter.post('/', spaceController.createNewSpace);
spaceRouter.post('/uploadImages', uploadCloud.array('images', 10), spaceController.uploadImages);
spaceRouter.post('/removeImage', spaceController.removeImages);
spaceRouter.delete('/delete/:id', spaceController.deleteSpace);
spaceRouter.put('/update-censorship/:id', spaceController.updateSpaceCensorshipAndCommunityStandards);
spaceRouter.get("/proposed/:userId", spaceController.getProposedSpaces);
spaceRouter.get("/statistic/:userId", spaceController.getBookingDetailsSpaces);
spaceRouter.get("/with-bookings/:spaceId",spaceController.getBookingDetailsSpace);

// tim kiem space
spaceRouter.get("/search/:name", async (req, res, next) => {
  try {
    const name = req.params.name;
    const rgx = (pattern) => new RegExp(`.*${pattern}.*`);
    const searchRgx = rgx(name);

    const searchResult = await Spaces.find({
      name: { $regex: searchRgx, $options: "i" },
    });
    // res.send(searchResult);
    res.status(200).json(searchResult);

  } catch (error) {
    // throw new Error(error.toString());
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// });
spaceRouter.get("/filter", spaceController.getFilteredSpaces);


// get theo id
spaceRouter.get("/cate/:id", spaceController.getSimilarSpaces);

// update space
spaceRouter.post("/update/:id", spaceController.updateSpace);

// get statistic for space belong userId, include booking details
spaceRouter.get("/statistic/:userId", spaceController.getBookingDetailsSpaces);
// so sánh
spaceRouter.get("/compare-spaces-differences", async (req, res) => {
  const { id1, id2 } = req.query;

  try {
    // search hai sản phẩm
    const space1 = await Spaces.findById(id1);
    const space2 = await Spaces.findById(id2);

    // nếu not found
    if (!space1 || !space2) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy một hoặc cả hai sản phẩm" });
    }

    // So sánh các trường in ra những trường khác
    const differences = {};

    const image1 =
      space1.images && space1.images.length > 0 ? space1.images[0] : null;
    const image2 =
      space2.images && space2.images.length > 0 ? space2.images[0] : null;

    differences.images = { space1: image1, space2: image2 };

    if (space1.name !== space2.name) {
      differences.name = { space1: space1.name, space2: space2.name };
    }

    if (space1.location !== space2.location) {
      differences.location = {
        space1: space1.location,
        space2: space2.location,
      };
    }

    if (space1.area !== space2.area) {
      differences.area = { space1: space1.area, space2: space2.area };
    }

    if (space1.pricePerHour !== space2.pricePerHour) {
      differences.pricePerHour = {
        space1: space1.pricePerHour,
        space2: space2.pricePerHour,
      };
    }
    if (space1.pricePerDay !== space2.pricePerDay) {
      differences.pricePerDay = {
        space1: space1.pricePerDay,
        space2: space2.pricePerDay,
      };
    }
    if (space1.pricePerMonth !== space2.pricePerMonth) {
      differences.pricePerMonth = {
        space1: space1.pricePerMonth,
        space2: space2.pricePerMonth,
      };
    }

    // if (space1.status !== space2.status) {
    //   differences.status = { space1: space1.status, space2: space2.status };
    // }

    // nếu k khác
    if (Object.keys(differences).length === 0) {
      // return res.json({ message: "Hai sản phẩm giống nhau" });
      return res.status(200).json({ message: "Hai sản phẩm giống nhau" });

    }

    // return những cái khác
    // res.json(differences);
    res.status(200).json(differences);
  } catch (error) {
    res.status(500).json({ message: "Đã xảy ra lỗi khi so sánh sản phẩm" });
  }
});

spaceRouter.get("/compare-spaces", async (req, res) => {
  const { id1, id2 } = req.query;

  try {
    // Tìm kiếm hai sản phẩm
    const space1 = await Spaces.findById(id1);
    const space2 = await Spaces.findById(id2);

    // Nếu không tìm thấy
    if (!space1 || !space2) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy một hoặc cả hai sản phẩm" });
    }

    // Tạo đối tượng để chứa thông tin so sánh
    const comparisonResult = {
      space1: {
        images:
          space1.images && space1.images.length > 0 ? space1.images[0] : null,
        name: space1.name,
        location: space1.location,
        area: space1.area,
        pricePerHour: space1.pricePerHour,
        pricePerDay: space1.pricePerDay,
        // pricePerWeek: space1.pricePerWeek,
        pricePerMonth: space1.pricePerMonth,
        // status: space1.status,
        images:
          space1.images && space1.images.length > 0 ? space1.images[0] : null,
          latLng: space1.latLng
      },
      space2: {
        images:
          space2.images && space2.images.length > 0 ? space2.images[0] : null,
        name: space2.name,
        location: space2.location,
        area: space2.area,
        pricePerHour: space2.pricePerHour,
        pricePerDay: space2.pricePerDay,
        // pricePerWeek: space2.pricePerWeek,
        pricePerMonth: space2.pricePerMonth,
        // status: space2.status,
        latLng: space2.latLng

      },
    };

    // Trả về tất cả thông tin của hai sản phẩm
    // res.json(comparisonResult);
    res.status(200).json(comparisonResult);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Đã xảy ra lỗi khi so sánh sản phẩm" });
  }
});

spaceRouter.get("/:id", async (req, res, next) => {
  try {
    const space = await Spaces.findById(req.params.id)
      .populate("userId")
      .populate("rulesId")
      .populate("appliancesId")
      .populate("categoriesId")
      .populate("communityStandardsId")
      .exec();
    if (!space) {
      // throw createError(400, "Space not found");
      return res.status(404).json({ message: "Space not found" });

    }

    res.status(200).json(space);
  } catch (error) {
    // next(error);
    res.status(500).json({ message: "Đã xảy ra lỗi khi lấy sản phẩm" });
  }
});
// Get Space theo UseId
spaceRouter.get("/for/:id", async (req, res, next) => {
  try {
    const userId = req.params.id;
    const user = await Spaces.find({ userId: userId })
    .populate("userId")
    .exec();

    if (!user) {
      return res.status(404).json({ message: "Space not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Lỗi khi lấy thông tin ", error);
    res.status(500).json({ message: "Đã xảy ra lỗi khi lấy thông tin " });
  }
});


// chấp nhận post
spaceRouter.put("/update/:postId", async (req, res, next) => {
  const { postId } = req.params;
  const { censorship } = req.body;

  try {
    const postSpace = await Spaces.findOneAndUpdate(
      { _id: postId },
      { censorship: censorship },
      { new: true }
    );

    if (!postSpace) {
      return res.status(404).json({ message: "PostSpace not found" });
    }

    if (censorship === "Chấp nhận" || censorship === "Từ chối") {
      await notificationDao.saveAndSendNotification(
        postSpace.userId.toString(),
        `${postSpace.name} đã được ${censorship.toLowerCase()}`,
        postSpace.images && postSpace.images.length > 0 ? postSpace.images[0].url : null,
        `/spaces/${postSpace._id.toString()}`
      );
    }

    res.status(200).json(postSpace);
  } catch (error) {
    res.status(500).json({ message: "Đã xảy ra lỗi khi chấp nhận post" });
  }
});

export default spaceRouter;

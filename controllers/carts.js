import { cartDao } from "../dao/index.js";

const getListSpacesOfUser = async (req, res) => {
  try {
    const listSpacesByUser = req.params.id;
    if (!listSpacesByUser) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    const listSpaces = await cartDao.fetchListSpaceOfUser(listSpacesByUser);
    
    if (!listSpaces || listSpaces.length === 0) {
      return res.status(404).json({ message: "Not found spaces" });
    }

    res.status(200).json(listSpaces);

  } catch (error) {
    res.status(500).json({ message: error.toString() });
  }
};
const deleteListCartOfUser = async (req, res) => {
  try {
    const cartId = req.params.id;
    if (!cartId) {
      return res.status(400).json({ message: "Cart ID is required" });
    }
    
    const cartList = await cartDao.removeListSpaceOfUser(cartId);
    if (cartList) {
      res.status(200).json(cartList);
    } else {
      res.status(404).json("Not Found");
    }
  } catch (error) {
    res.status(500).json({ message: error.toString() });
  }
};
const addSpacesToCart = async (req, res) => {
  try {
    const { userId, spaceId, categoriesId, quantity } = req.body;
    if (!userId || !spaceId || !categoriesId || quantity == null) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    if (quantity <= 0) {
      return res.status(400).json({ message: "Invalid quantity value" });
    }

    const newSpaceItem = await cartDao.addSpacesToCart(
      userId,
      spaceId,
      categoriesId,
      quantity
    );
    res
      .status(200)
      .json({ message: "Space added to cart successfully", newSpaceItem });
  } catch (error) {
    res.status(500).json({ message: error.toString() });
  }
};
const updateCart = async (req, res) => {
  try {
    const { quantity } = req.body;

    if (quantity <= 0) {
      return res.status(400).json({ message: "Invalid quantity value" });
    }

    const updateCart = await cartDao.updateCart(req.params.id, req.body);
    if (!updateCart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    res.status(200).json({ message: "success", updateCart });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export default {
  getListSpacesOfUser,
  deleteListCartOfUser,
  addSpacesToCart,
  updateCart,
};

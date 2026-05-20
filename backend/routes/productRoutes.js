const express = require("express");
const Product = require("../models/Product");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

// Public: get all products
router.get("/", async (req, res) => {
  try {
    const { search, category } = req.query;

    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { shortDescription: { $regex: search, $options: "i" } }
      ];
    }

    if (category && category !== "All") {
      filter.category = category;
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });

    res.json(products);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch products",
      error: error.message
    });
  }
});

// Public: get one product
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found"
      });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch product",
      error: error.message
    });
  }
});

// Admin only: add product
router.post("/", requireAuth, async (req, res) => {
  try {
    const {
      name,
      category,
      shortDescription,
      fullDescription,
      usage,
      imageUrl,
      status
    } = req.body;

    if (!name || !category || !shortDescription) {
      return res.status(400).json({
        message: "Name, category, and short description are required"
      });
    }

    const product = await Product.create({
      name,
      category,
      shortDescription,
      fullDescription,
      usage,
      imageUrl,
      status
    });

    res.status(201).json({
      message: "Product added successfully",
      product
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to add product",
      error: error.message
    });
  }
});

// Admin only: update product
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!product) {
      return res.status(404).json({
        message: "Product not found"
      });
    }

    res.json({
      message: "Product updated successfully",
      product
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update product",
      error: error.message
    });
  }
});

// Admin only: delete product
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found"
      });
    }

    res.json({
      message: "Product deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete product",
      error: error.message
    });
  }
});

module.exports = router;
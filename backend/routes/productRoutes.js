const express = require("express");
const Product = require("../models/product");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

function cleanArray(value) {
  if (Array.isArray(value)) {
    return value.map(item => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[,\n]/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normaliseProductPayload(body) {
  return {
    name: body.name,
    brand: body.brand,
    category: body.category,
    shortDescription: body.shortDescription,
    fullDescription: body.fullDescription,
    usage: body.usage,
    imageUrl: body.imageUrl,
    images: cleanArray(body.images),
    status: body.status,
    industries: cleanArray(body.industries),
    surfaces: cleanArray(body.surfaces),
    features: cleanArray(body.features)
  };
}

// Public: get all products
router.get("/", async (req, res) => {
  try {
    const { search, category, brand, industry, surface } = req.query;

    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { shortDescription: { $regex: search, $options: "i" } },
        { industries: { $regex: search, $options: "i" } },
        { surfaces: { $regex: search, $options: "i" } },
        { features: { $regex: search, $options: "i" } }
      ];
    }

    if (category && category !== "All") filter.category = category;
    if (brand && brand !== "All") filter.brand = brand;
    if (industry && industry !== "All") filter.industries = industry;
    if (surface && surface !== "All") filter.surfaces = surface;

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
      return res.status(404).json({ message: "Product not found" });
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
    const payload = normaliseProductPayload(req.body);

    if (!payload.name || !payload.category || !payload.shortDescription) {
      return res.status(400).json({
        message: "Name, category, and short description are required"
      });
    }

    const product = await Product.create(payload);

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
    const payload = normaliseProductPayload(req.body);

    // Keep existing values when a field is not sent
    Object.keys(payload).forEach(key => {
      if (payload[key] === undefined) delete payload[key];
    });

    const product = await Product.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
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
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete product",
      error: error.message
    });
  }
});

module.exports = router;

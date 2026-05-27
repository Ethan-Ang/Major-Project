const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true
    },
    brand: {
      type: String,
      default: "Yee Lim",
      trim: true
    },
    category: {
      type: String,
      required: [true, "Product category is required"],
      trim: true
    },
    shortDescription: {
      type: String,
      required: [true, "Short description is required"],
      trim: true
    },
    fullDescription: {
      type: String,
      default: "",
      trim: true
    },
    usage: {
      type: String,
      default: "",
      trim: true
    },
    imageUrl: {
      type: String,
      default: "",
      trim: true
    },
    images: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      enum: ["Available", "Unavailable"],
      default: "Available"
    },
    industries: {
      type: [String],
      default: []
    },
    surfaces: {
      type: [String],
      default: []
    },
    features: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Product", productSchema);

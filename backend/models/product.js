const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
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
    status: {
      type: String,
      enum: ["Available", "Unavailable"],
      default: "Available"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Product", productSchema);
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const productRoutes = require("./routes/productRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();

// Connect database
connectDB();

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:3000"
    ],
    credentials: true
  })
);

app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.json({
    message: "Project ReBond backend is running"
  });
});

// Health check route
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Backend API is healthy"
  });
});

// API routes
app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found"
  });
});

const PORT = process.env.PORT || 5050;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
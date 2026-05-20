const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

// Register first admin
// Use this once during development, then you can remove/disable it later.
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: "Username and password are required"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters"
      });
    }

    const existingAdmin = await Admin.findOne({
      username: username.toLowerCase()
    });

    if (existingAdmin) {
      return res.status(400).json({
        message: "Admin username already exists"
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const admin = await Admin.create({
      username: username.toLowerCase(),
      passwordHash
    });

    res.status(201).json({
      message: "Admin registered successfully",
      admin: {
        id: admin._id,
        username: admin.username
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to register admin",
      error: error.message
    });
  }
});

// Login admin
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: "Username and password are required"
      });
    }

    const admin = await Admin.findOne({
      username: username.toLowerCase()
    });

    if (!admin) {
      return res.status(401).json({
        message: "Invalid username or password"
      });
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid username or password"
      });
    }

    const token = jwt.sign(
      {
        id: admin._id,
        username: admin.username
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d"
      }
    );

    res.json({
      message: "Login successful",
      token,
      admin: {
        id: admin._id,
        username: admin.username
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "Login failed",
      error: error.message
    });
  }
});

// Check current admin
router.get("/me", requireAuth, async (req, res) => {
  res.json({
    admin: req.admin
  });
});

module.exports = router;
const router = require("express").Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { protect } = require("../middleware/auth");
const { sendWelcome, sendResetCode } = require("../services/emailService");
// const crypto = require("crypto");
const bcrypt = require('bcryptjs');

const makeToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });

// Password Validation Function
const validatePassword = (password) => {
  const regex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

  return regex.test(password);
};

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({
        success: false,
        error: "All fields required",
      });

    // Password Policy Check
    if (!validatePassword(password)) {
      return res.status(400).json({
        success: false,
        error:
          "Password must be at least 8 characters and include uppercase, lowercase, number, and special character",
      });
    }

    if (await User.findOne({ email: email.toLowerCase() }))
      return res.status(400).json({
        success: false,
        error: "Email already registered",
      });

    if (await User.findOne({ username }))
      return res.status(400).json({
        success: false,
        error: "Username taken",
      });

    const count = await User.countDocuments();
    const role = count === 0 ? "admin" : "user";

    const user = await User.create({
      username,
      email,
      password,
      role,
    });

    try {
      const Category = require("../models/Category");

      const defaults = [
        { name: "Food & Dining", icon: "🍔", color: "#EF4444" },
        { name: "Transportation", icon: "🚗", color: "#F59E0B" },
        { name: "Housing", icon: "🏠", color: "#3B82F6" },
        { name: "Shopping", icon: "🛍️", color: "#8B5CF6" },
        { name: "Entertainment", icon: "🎬", color: "#EC4899" },
        { name: "Healthcare", icon: "🏥", color: "#10B981" },
        { name: "Education", icon: "📚", color: "#F97316" },
        { name: "Bills & Utilities", icon: "⚡", color: "#6366F1" },
        { name: "Travel", icon: "✈️", color: "#14B8A6" },
        { name: "Fitness", icon: "💪", color: "#84CC16" },
        { name: "Personal Care", icon: "💅", color: "#F43F5E" },
        { name: "Others", icon: "📦", color: "#64748B" },
      ];

      await Category.insertMany(
        defaults.map((d) => ({
          ...d,
          user: user._id,
          isDefault: true,
        })),
      );
    } catch (_) {}

    sendWelcome(user.email, user.username).catch((err) =>
      console.error("[Email] Welcome failed:", err.message),
    );

    res.status(201).json({
      success: true,
      token: makeToken(user),
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        settings: user.settings,
      },
    });
  } catch (err) {
    console.error("[register]", err.message);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({
        success: false,
        error: "Email and password required",
      });

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user)
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });

    if (!user.isActive)
      return res.status(403).json({
        success: false,
        error: "Account deactivated. Contact admin.",
      });

    if (!(await user.matchPassword(password)))
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });

    res.json({
      success: true,
      token: makeToken(user),
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        settings: user.settings,
      },
    });
  } catch (err) {
    console.error("[login]", err.message);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// GET /api/auth/me
router.get("/me", protect, (req, res) => {
  const u = req.user;

  res.json({
    success: true,
    user: {
      _id: u._id,
      username: u.username,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      settings: u.settings,
      createdAt: u.createdAt,
    },
  });
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "No account found with this email",
      });
    }

    // 1 Minute Cooldown
    if (
      user.resetLastSent &&
      Date.now() - user.resetLastSent.getTime() < 60000
    ) {
      return res.status(429).json({
        success: false,
        error: "Wait 1 minute before requesting again",
      });
    }

    // Max 5 Requests
    if (user.resetAttempts >= 5) {
      return res.status(429).json({
        success: false,
        error: "Too many reset requests. Try later.",
      });
    }

    // Generate OTP
    const code = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    // Hash OTP
    user.resetCode = await bcrypt.hash(code, 10);

    // Expiry 10 Minutes
    user.resetCodeExpire = Date.now() + 10 * 60 * 1000;

    user.resetAttempts += 1;
    user.resetLastSent = new Date();

    // Reset wrong verification count
    user.resetVerifyAttempts = 0;

    await user.save();

    // Send Email
    await sendResetCode(
      user.email,
      user.username,
      code
    );

    res.json({
      success: true,
      message: "Verification code sent to email",
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { email, code, password } = req.body;

    if (!email || !code || !password) {
      return res.status(400).json({
        success: false,
        error: "All fields are required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // OTP exists + not expired
    if (
      !user.resetCode ||
      !user.resetCodeExpire ||
      user.resetCodeExpire < Date.now()
    ) {
      return res.status(400).json({
        success: false,
        error: "Code expired. Request new code.",
      });
    }

    // Compare hashed OTP
    const ok = await bcrypt.compare(
      code,
      user.resetCode
    );

    if (!ok) {
      user.resetVerifyAttempts += 1;

      // Block after 5 wrong tries
      if (user.resetVerifyAttempts >= 5) {
        user.resetCode = undefined;
        user.resetCodeExpire = undefined;
      }

      await user.save();

      return res.status(400).json({
        success: false,
        error: "Invalid verification code",
      });
    }

    // Strong Password Check
    if (!validatePassword(password)) {
      return res.status(400).json({
        success: false,
        error:
          "Password must be at least 8 characters and include uppercase, lowercase, number and special character",
      });
    }

    // Save new password
    user.password = password;

    // Clear reset data
    user.resetCode = undefined;
    user.resetCodeExpire = undefined;
    user.resetAttempts = 0;
    user.resetLastSent = undefined;
    user.resetVerifyAttempts = 0;

    await user.save();

    res.json({
      success: true,
      message: "Password reset successful",
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

module.exports = router;

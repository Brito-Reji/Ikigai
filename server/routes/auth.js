import express from "express";
import {
  googleAuth,
  studentLogin,
  studentRegister,
} from "../controllers/students/studentController.js";
import jwt from "jsonwebtoken";
import { adminLogin } from "../controllers/admin/adminController.js";
import {
  instructorGoogleAuth,
  instructorRegister,
  instructorSignin,
} from "../controllers/instructor/instructorController.js";
import { User } from "../models/User.js";
import { Instructor } from "../models/Instructor.js";
import { sentOTP, verifyOTP, verifyOTPOnly } from "../utils/OTPServices.js";
import { generateTokens } from "../utils/generateTokens.js";
import { resetPassword } from "../controllers/common/forgetPassword.js";
const router = express.Router();

// Instructor Routes
router.post("/instructor/register", instructorRegister);
router.post("/instructor/signin", instructorSignin);
router.route("/instructor/google").post(instructorGoogleAuth);

// Student
router.post("/student/register", studentRegister);
router.post("/student/login", studentLogin);
router
  .route("/student/google")
  .post(googleAuth)
  .get(() => { });

router.post("/admin/login", adminLogin);

// OTP
router.post("/send-otp", sentOTP);
router.post("/verify-otp", verifyOTP);
router.post("/verify-otp-only", verifyOTPOnly);

// Password Reset
router.post("/reset-password", resetPassword);

// Check username availability using query params
router.get("/check-username", async (req, res) => {
  try {
    const { username } = req.query;

    // Check if username is provided
    if (!username || username.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Username must be at least 3 characters",
      });
    }

    // Check in both User and Instructor collections
    const userExists = await User.findOne({ username: username.toLowerCase() });
    const instructorExists = await Instructor.findOne({ username: username.toLowerCase() });

    if (userExists || instructorExists) {
      return res.status(200).json({
        success: true,
        available: false,
        message: "Username is already taken",
      });
    }

    return res.status(200).json({
      success: true,
      available: true,
      message: "Username is available",
    });
  } catch (error) {
    console.error("Error checking username:", error);
    return res.status(500).json({
      success: false,
      message: "Error checking username availability",
    });
  }
});

// Refresh token endpoint
router.post("/refresh", async (req, res) => {
  try {
    const incomingToken =
      req.cookies?.refreshToken ||
      req.headers["x-refresh-token"] ||
      req.query.refreshToken;
    console.log("Refresh token from request:", incomingToken);

    if (!incomingToken) {
      console.log("No refresh token provided");
      return res
        .status(403)
        .json({ success: false, message: "No refresh token provided" });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(incomingToken, process.env.JWT_REFRESH_SECRET);
      console.log("Refresh token decoded:", decoded);
    } catch (e) {
      console.log("Invalid refresh token:", e);
      return res
        .status(403)
        .json({ success: false, message: "Invalid refresh token" });
    }

    // Try to find user in both User and Instructor collections
    let user = await User.findById(decoded.id);
    if (!user) {
      user = await Instructor.findById(decoded.id);
    }

    if (!user) {
      console.log("User not found for refresh token");
      return res
        .status(403)
        .json({ success: false, message: "User not found" });
    }


    console.log(user)
    if (user.isBlocked) {
      console.log("User is blocked");
      return res
        .status(403)
        .json({ success: false, message: "Account is blocked" });
    }

    // Check if the refresh token matches the one stored in the database
    if (user.refreshToken !== incomingToken) {
      console.log("Refresh token mismatch");
      return res
        .status(403)
        .json({ success: false, message: "Invalid refresh token" });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens({
      userId: user._id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      role: user.role,
      profileImageUrl: user.profileImageUrl,
      isVerified: user.isVerified,
    });

    // Update refresh token in database
    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    // Set refresh token in HttpOnly cookie
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    console.log("New access token generated:", accessToken);
    return res.status(200).json({ success: true, accessToken });
  } catch (err) {
    console.error("Refresh token error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

// Get current user from access token
router.get("/me", async (req, res) => {
  try {
    // Extract token from Authorization header
    let accessToken = null;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      accessToken = req.headers.authorization.split(" ")[1];
    }



    if (!accessToken) {
      console.log("No token provided in request");
      return res
        .status(401)
        .json({ success: false, message: "No token provided" });
    }

    const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);

    let user = await User.findById(decoded.id);
    if (!user) {
      user = await Instructor.findById(decoded.id);
    }

    if (!user) {
      console.log("User not found in database");
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user is blocked
    if (user.isBlocked) {
      console.log("User is blocked:", user.email);
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked. Please contact support.",
        isBlocked: true,
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        role: user.role,
        profileImageUrl: user.profileImageUrl,
        isVerified: user.isVerified,
        isBlocked: user.isBlocked,
      },
    });
  } catch (err) {
    console.log("Token verification error:", err);
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
});

export default router;

import asyncHandler from "express-async-handler";
import bcrypt from "bcrypt";
import { User } from "../../models/User.js";
import { OAuth2Client } from "google-auth-library";
import { generateTokens } from "../../utils/generateTokens.js";
import { sendOTPToEmail } from "../../utils/OTPServices.js";

// import { User } from './model/'

export const studentRegister = asyncHandler(async (req, res) => {
  console.log("Student registration endpoint hit!");
  console.log("Request body:", req.body);

  let { email, username, firstName, lastName, password } = req.body;

  if (!email || !username || !firstName || !lastName || !password) {
    console.log("Missing required fields");
    return res
      .status(400)
      .json({ success: false, message: "Please provide all required fields" });
  }

  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  console.log(existingUser, " existing user student");

  // if verified user already exists -> block registration
  if (existingUser && existingUser.isVerified) {
    return res
      .status(400)
      .json({ success: false, message: "Email or username already exists" });
  }

  // Validate email format
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid email address",
    });
  }

  // Validate password length
  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters long",
    });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  let role = "student";
  let user;

  // if user exists but not verified, update their details
  if (existingUser && !existingUser.isVerified) {
    existingUser.username = username;
    existingUser.firstName = firstName;
    existingUser.lastName = lastName;
    existingUser.password = hashedPassword;
    existingUser.role = role;
    user = await existingUser.save();
    console.log("Updated unverified user:", user.email);
  } else {
    // create new user
    user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      username,
      firstName,
      lastName,
      role,
    });
  }

  try {
    console.log('asd')
    await sendOTPToEmail(email);
    console.log("OTP sent successfully to", email);

    let {  refreshToken } = generateTokens({
      userId: user._id,
      role: user.role,
    });

    // Store refresh token in database
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    // Set refresh token in HttpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json({
      success: true,
      message: existingUser
        ? "Unverified account updated, OTP sent again"
        : "OTP sent successfully",
    });
  } catch (err) {
    console.error("OTP service failed:", err.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to send OTP. Try again." });
  }
});


export const studentLogin = asyncHandler(async (req, res) => {
  let { email, password } = req.body;
  console.log("login response ->", email);
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "fields cannot be empty",
    });
  }
  let user = await User.findOne({
    $or: [{ email: email }, { username: email }],
  }).select("+password").exec();

  // Check if user exists
  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });
  }

  if (user.authType == "google") {
    return res.status(401).json({
      success: false,
      message: "This account was created with Google. Please use Google Sign-In to continue."
    })
  }

  // Check if user is verified
  if (!user.isVerified) {
    try {
      await sendOTPToEmail(user.email);
      console.log("OTP sent for verification to", user.email);

      return res.status(200).json({
        success: true,
        message: "OTP sent for verification",
      });
    } catch (err) {
      console.error("OTP service failed:", err.message);
      return res
        .status(500)
        .json({ success: false, message: "Failed to send OTP. Try again." });
    }
  }
  console.log(user);
  console.log(password, user?.password);
  bcrypt.compare(password, user.password, (err, result) => {
    if (err) {
      console.log(err);
      return;
    }

    if (result) {
      let { accessToken, refreshToken } = generateTokens({
        userId: user._id,
        role: user.role,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        profileImageUrl: user.profileImageUrl,
        isVerified: user.isVerified,
      });

      // Store refresh token in database
      user.refreshToken = refreshToken;
      user.save({ validateBeforeSave: false });

      // Set refresh token in HttpOnly cookie
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Return response in the expected format
      return res.status(200).json({
        success: true,
        accessToken,
        user: {
          email: user.email,
          role: user.role,
        },
      });
    } else {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }
  });
});

export const googleAuth = asyncHandler(async (req, res) => {
  const client = new OAuth2Client();
  const { token } = req.body;
  console.log(token);
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.VITE_GOOGLE_ID,
  });
  console.log(ticket);
  let { email, name, picture } = ticket.payload;
  let [firstName, ...lastName] = name.split(" ");
  lastName = lastName.join();
  let user = await User.findOne({ email });
  console.log(!!user);
  if (user) {
    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "user is blocked by the admin ",
      });
    }
    let needUpdate = false;
    if (user.firstName !== firstName) {
      user.firstName = firstName;
      needUpdate = true;
    }
    if (user.lastName !== lastName) {
      user.lastName = lastName;
      needUpdate = true;
    }
    if (user.profileImageUrl !== picture) {
      user.profileImageUrl = picture;
      needUpdate = true;
    }
    if (needUpdate) {
      await user.save();
    }

    let { accessToken, refreshToken } = generateTokens({
      userId: user._id,
      role: user.role,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      profileImageUrl: user.profileImageUrl,
      isVerified: user.isVerified,

    });

    // Store refresh token in database
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    // Set refresh token in HttpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json({
      success: true,
      accessToken,
      user: {
        email: user.email,
        role: user.role,
      },
    });
  }
  if (!user) {
    // console.log(lastName.join())
    console.log(firstName)
    user = await User.create({
      email,
      firstName,
      lastName,
      username: null,
      isVerified: true,
      profileImageUrl: picture,
      authType: 'google'
    });
    let { accessToken, refreshToken } = generateTokens({
      userId: user._id,
      role: user.role,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      profileImageUrl: user.profileImageUrl,
      isVerified: user.isVerified,
    });

    // Store refresh token in database
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    // Set refresh token in HttpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json({
      success: true,
      accessToken,
      user: {
        email: user.email,
        role: user.role,
      },
    });
  }
});

const studentForgetPassword = asyncHandler(async (req, res) => { });

const studentAddToCart = asyncHandler(async (req, res) => { });

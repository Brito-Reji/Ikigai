import asyncHandler from "express-async-handler";
import nodemailer from 'nodemailer'
import { Otp } from "../models/Otp.js";
import { User } from "../models/User.js";
import { Instructor } from "../models/Instructor.js";
// import { Users } from "lucide-react";
import { generateTokens } from "./generateTokens.js";

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// export const sendOTPToEmail = async (email) => {
//   if (!email) {
//     throw new Error("Email is required");
//   }

//   const otp = generateOTP();
//   console.log(otp)
//   await Otp.create({ email, otp });
//   console.log(email)
//   const transporter = nodemailer.createTransport({
//     host: "smtp.gmail.com",
//     port: 587,
//     secure: false,
//     pool: true,
//     name: "localhost",
//     auth: {
//       user: "britoreji2006@gmail.com",
//       pass: "unvxdryuaehmmcxm",
//     },
//   });
//   const mailOptions = {
//     from: process.env.EMAIL ,
//     to: email,
//     subject: "Your OTP Code",
//     html: `<h2>Your OTP is: ${otp}</h2><p>Expires in 2 minutes.</p>`,
//   };
//   try {
    
//     await transporter.sendMail(mailOptions);
//     console.log("OTP generated for", email, " ", otp);
//     return { otp, success: true };
//   } catch (error) {
//     console.log(error)
//   }

// };
const transporter = nodemailer.createTransport({
  service: "gmail",
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.nodeMailerEmail,
    pass: process.env.nodeMailerPassword,
  },
});

// Verify connection on startup
transporter.verify(function (error, success) {
  if (error) {
    console.log("SMTP connection error:", error);
  } else {
    console.log("SMTP server is ready to send emails");
  }
});


export const sendOTPToEmail = async (email) => {
  if (!email) {
    throw new Error("Email is required");
  }

  const otp = generateOTP();
  console.log(otp);
  await Otp.create({ email, otp });
  console.log(email);

  const mailOptions = {
    from: process.env.EMAIL_USER || "britoreji2006@gmail.com",
    to: email,
    subject: "Your OTP Code",
    html: `<h2>Your OTP is: ${otp}</h2><p>Expires in 2 minutes.</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("OTP sent successfully to", email, " ", otp);
    return { otp, success: true };
  } catch (error) {
    console.log("Email sending error:", error);
    throw error; // Re-throw so the route handler can catch it
  }
};


// Route handler for sending OTP
export const sentOTP = asyncHandler(async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) { return res.status(400).json({ message: "email is required" }) }

    const result = await sendOTPToEmail(email);

    res
      .status(200)
      .json({ message: "OTP generated", otp: result.otp, success: true });
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ message: err.message });
  }
});

export const verifyOTP = asyncHandler(async (req, res) => {
  let { email, otp } = req.body;
  console.log("req.body->", req.body);
  let data = await Otp.findOne({ otp, email });
  console.log(data);
  console.log(email, ":", data?.email, "    ", otp, ":", data?.otp);
  console.log("data from the db ->", data);
  const resl = await User.findOne({ email });
  console.log("resl->", resl);
  if (data?.email === email && data?.otp === otp) {
    console.log("User verfied", resl);
    if (resl) {
      console.log("user verfied");
      let student = await User.findOneAndUpdate(
        { email },
        { isVerified: true }
      );
      let { accessToken, refreshToken } = generateTokens({
        userId: student._id,
        email: student.email,
        username: student.username,
        firstName: student.firstName,
        role: student.role,
        profileImageUrl: student.profileImageUrl,
        isVerified: true,
      });

      student.refreshToken = refreshToken;
      await student.save({ validateBeforeSave: false });

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        accessToken,
        user: student,
        success: true,
        message:
          "user verified succesfully Email verified! Redirecting to dashboard...",
      });
    } else {
      console.log("instructor verfied");
      let instructor = await Instructor.findOneAndUpdate(
        { email },
        { isVerified: true }
      );
      console.log("instructor->", instructor);
      let { accessToken, refreshToken } = generateTokens({
        userId: instructor._id,
        email: instructor.email,
        username: instructor.username,
        firstName: instructor.firstName,
        role: instructor.role,
        profileImageUrl: instructor.profileImageUrl,
        isVerified: true,
      });

      instructor.refreshToken = refreshToken;
      await instructor.save({ validateBeforeSave: false });

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        accessToken,
        instructor: instructor,
        success: true,
        message:
          "user verified succesfully Email verified! Redirecting to dashboard...",
      });
    }
  } else {
    res.status(400).json({
      success: false,
      message: "Incorrect OTP",
    });
  }
});

// Verify OTP only (for forget password flow) - doesn't log in user
export const verifyOTPOnly = asyncHandler(async (req, res) => {
  let { email, otp } = req.body;
  
  if (!email || !otp) {
    return res.status(400).json({
      success: false,
      message: "Email and OTP are required",
    });
  }

  console.log("Verify OTP only for forget password:", email, otp);
  
  let data = await Otp.findOne({ otp, email });
  
  if (data?.email === email && data?.otp === otp) {
    // OTP is valid, but don't log in the user
    // Just confirm the OTP is correct
    console.log("OTP verified for password reset");
    
    // Delete the OTP after verification
    await Otp.deleteOne({ email, otp });
    
    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } else {
    return res.status(400).json({
      success: false,
      message: "Incorrect OTP or OTP expired",
    });
  }
});

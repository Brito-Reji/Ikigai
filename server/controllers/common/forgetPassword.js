import asyncHandler from 'express-async-handler'
import bcrypt from 'bcrypt'
import { User } from '../../models/User.js';
import { Instructor } from '../../models/Instructor.js';

export const resetPassword = asyncHandler(async (req, res) => {
  let { email, newPassword } = req.body;
  
  if (!email || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Email and new password are required",
    });
  }

  // Validate password strength
  if (newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters long",
    });
  }

  try {
    // Check if user exists (check both User and Instructor collections)
    let user = await User.findOne({ email });
    let isInstructor = false;

    if (!user) {
      user = await Instructor.findOne({ email });
      isInstructor = true;
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update the password
    if (isInstructor) {
      await Instructor.findOneAndUpdate(
        { email },
        { password: hashedPassword }
      );
    } else {
      await User.findOneAndUpdate(
        { email },
        { password: hashedPassword }
      );
    }

    console.log(`Password reset successfully for: ${email}`);

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.status(500).json({
      success: false,
      message: "Error resetting password",
    });
  }
});

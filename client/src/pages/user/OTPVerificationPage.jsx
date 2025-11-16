import React, { useState, useEffect } from "react";
import { ArrowRight, Mail, Clock, CheckCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useRedux.js";
import { verifyOTP, clearError } from "@/store/slices/authSlice.js";

export default function OTPVerificationPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { loading, error, dispatch } = useAuth();

  // Get email and role from navigation state
  const [email] = useState(location.state?.email || "");
  const [role] = useState(location.state?.role || "student");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpTimer, setOtpTimer] = useState(0);
  const [resendingOtp, setResendingOtp] = useState(false);
  const [verified, setVerified] = useState(false);

  // Initialize timer from localStorage on mount
  useEffect(() => {
    const storedExpiry = localStorage.getItem("otpExpiry");

    if (storedExpiry) {
      const expiryTime = parseInt(storedExpiry, 10);
      const now = Date.now();
      const remainingSeconds = Math.floor((expiryTime - now) / 1000);

      if (remainingSeconds > 0) {
        setOtpTimer(remainingSeconds);
      } else {
        // OTP expired, clean up
        localStorage.removeItem("otpExpiry");
        setOtpTimer(0);
      }
    } else {
      // First time loading, start with 2 minutes
      startNewTimer(120);
    }
  }, []);

  // Timer effect
  useEffect(() => {
    let interval;
    if (otpTimer > 0 && !verified) {
      interval = setInterval(() => {
        setOtpTimer((prev) => {
          const newTime = prev - 1;

          // Update localStorage with new expiry time
          if (newTime > 0) {
            const expiryTime = Date.now() + newTime * 1000;
            localStorage.setItem("otpExpiry", expiryTime.toString());
          } else {
            // Timer expired, clean up
            localStorage.removeItem("otpExpiry");
          }

          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer, verified]);

  // Clear errors on mount
  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Helper function to start a new timer
  const startNewTimer = (seconds) => {
    const expiryTime = Date.now() + seconds * 1000;
    localStorage.setItem("otpExpiry", expiryTime.toString());
    setOtpTimer(seconds);
  };

  // Format timer display (MM:SS)
  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Handle OTP input change
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  // Handle backspace
  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  // Handle paste
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    pastedData.split("").forEach((char, index) => {
      if (index < 6) newOtp[index] = char;
    });
    setOtp(newOtp);

    const lastIndex = Math.min(pastedData.length, 5);
    const lastInput = document.getElementById(`otp-${lastIndex}`);
    if (lastInput) lastInput.focus();
  };

  // Verify OTP
  const handleVerifyOtp = async () => {
    const otpValue = otp.join("");
    const isForgetPassword = location.state?.forget;

    if (otpValue.length !== 6) {
      // Error handling is now done through Redux
      return;
    }

    if (otpTimer === 0) {
      // Error handling is now done through Redux
      return;
    }

    try {
      // If this is forget password flow, just verify OTP without logging in
      if (isForgetPassword) {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/auth/verify-otp-only`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, otp: otpValue }),
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "OTP verification failed");
        }

        // Clear timer from localStorage on successful verification
        localStorage.removeItem("otpExpiry");
        setVerified(true);

        // Redirect to reset password page
        setTimeout(() => {
          navigate("/reset-password", {
            state: { email, otpVerified: true },
            replace: true,
          });
        }, 1500);
      } else {
        // Normal signup flow
        // Use Redux action to verify OTP
        await dispatch(verifyOTP({ email, otp: otpValue })).unwrap();

        // Clear timer from localStorage on successful verification
        localStorage.removeItem("otpExpiry");
        setVerified(true);

        // Redirect to course list page after successful verification
        // For student signup, redirect directly to course page
        setTimeout(() => {
          navigate("/course", {
            replace: true,
          });
        }, 1500);
      }
    } catch (error) {
      // Error is handled by Redux, but we still need to reset the form
      console.error("OTP verification error:", error);
      setOtp(["", "", "", "", "", ""]);
      document.getElementById("otp-0")?.focus();
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    setResendingOtp(true);

    try {
      // In a real implementation, you would call an API to resend OTP
      // For now, we'll just reset the timer and form
      startNewTimer(120);
      setOtp(["", "", "", "", "", ""]);
      document.getElementById("otp-0")?.focus();
    } finally {
      setResendingOtp(false);
    }
  };

  // Handle continue after verification
  const handleContinue = () => {
    navigate("/course", {
      replace: true,
    });
  };

  // Handle change email
  const handleChangeEmail = () => {
    navigate("/signup");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
              {verified ? (
                <CheckCircle className="w-8 h-8 text-green-600" />
              ) : (
                <Mail className="w-8 h-8 text-indigo-600" />
              )}
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-2">
            {verified ? "Verified!" : "Verify Your Email"}
          </h1>

          <p className="text-gray-600 text-center mb-8">
            {verified
              ? "Your email has been verified successfully"
              : `Enter the 6-digit code sent to ${email}`}
          </p>

          {verified ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-700 font-medium">
                  Email verified successfully!
                </span>
              </div>
              <button
                onClick={handleContinue}
                className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center justify-center space-x-2"
              >
                <span>Continue</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex gap-2 sm:gap-3 justify-center">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    className="w-12 h-12 sm:w-14 sm:h-14 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                    disabled={loading}
                  />
                ))}
              </div>

              {/* Error message from Redux */}
              {(error || (otp.join("").length !== 6 && loading)) && (
                <p className="text-sm text-red-500 text-center">
                  {error || "Please enter complete 6-digit OTP"}
                </p>
              )}

              <div className="flex items-center justify-center gap-2">
                {otpTimer > 0 ? (
                  <>
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span className="text-indigo-600 font-medium">
                      {formatTimer(otpTimer)}
                    </span>
                  </>
                ) : (
                  <span className="text-red-500 text-sm">OTP expired</span>
                )}
              </div>

              <button
                onClick={handleVerifyOtp}
                disabled={loading || otp.join("").length !== 6}
                className={`w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium transition flex items-center justify-center space-x-2 ${
                  loading || otp.join("").length !== 6
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-indigo-700"
                }`}
              >
                <span>{loading ? "Verifying..." : "Verify OTP"}</span>
                {!loading && <ArrowRight className="w-5 h-5" />}
              </button>

              <div className="text-center">
                <p className="text-gray-600 text-sm mb-2">
                  Didn't receive the code?
                </p>
                <button
                  onClick={handleResendOtp}
                  disabled={resendingOtp || otpTimer > 0}
                  className={`text-indigo-600 font-medium text-sm ${
                    resendingOtp || otpTimer > 0
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:text-indigo-700 hover:underline"
                  }`}
                >
                  {resendingOtp ? "Resending..." : "Resend OTP"}
                </button>
              </div>

              <div className="text-center pt-4 border-t border-gray-200">
                <button
                  onClick={handleChangeEmail}
                  className="text-gray-600 text-sm hover:text-gray-900"
                >
                  Change email address
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Need help?{" "}
          <a href="#" className="text-indigo-600 hover:underline">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}

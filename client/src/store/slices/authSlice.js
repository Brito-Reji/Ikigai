import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/axiosConfig.js";

// Async thunks for API calls
export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async ({ email, password, role }, { rejectWithValue }) => {
    try {
      const endpoint =
        role === "instructor"
          ? "/auth/instructor/signin"
          : "/auth/student/login";
      const response = await api.post(endpoint, { email, password });
      console.log("response", response)

      if (response.data.success) {
        const accessToken = response.data.accessToken;
        // Ensure we're storing a string, not an object
        if (typeof accessToken === 'object') {
          console.error("AccessToken is an object, extracting token string");
          localStorage.setItem("accessToken", accessToken.accessToken || JSON.stringify(accessToken));
        } else {
          localStorage.setItem("accessToken", accessToken);
        }
        console.log("Login successful, token stored:", accessToken);
        return {
          user: response.data.user || { email, role },
          accessToken: accessToken,
          role,
        };
      } else {
        console.log(console.log("error-> ", ))
        // If response is not successful but no error was thrown
        return rejectWithValue({
          message: response.data?.message || "Login failed",
        });
      }
    } catch (error) {
      if (
        
        error.response?.status === 403 &&
        error.response?.data?.requiresVerification
      ) {
        return rejectWithValue({
          message: error.response.data.message,
          requiresVerification: true,
          email,
        });
      }

      // Check if user is blocked
      if (error.response?.data?.isBlocked || error.response?.data?.message?.toLowerCase().includes('blocked')) {
        return rejectWithValue({
          message: error.response?.data?.message || "Your account has been blocked",
          isBlocked: true,
        });
      }

      return rejectWithValue({
        message: error.response?.data?.message || "Login failed",
      });
    }
  }
);

export const registerUser = createAsyncThunk(
  "auth/registerUser",
  async ({ userData, role }, { rejectWithValue }) => {
    try {
      const endpoint =
        role === "instructor"
          ? "/auth/instructor/register"
          : "/auth/student/register";
      const response = await api.post(endpoint, userData);
      console.log("response-> register redux", response)
      if (response.data.success) {
        return {
          message: response.data.message,
          email: userData.email,
          requiresVerification: true,
        };
      }
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "Registration failed",
      });
    }
  }
);

export const verifyOTP = createAsyncThunk(
  "auth/verifyOTP",
  async ({ email, otp }, { rejectWithValue }) => {
    try {
      const response = await api.post("/auth/verify-otp", { email, otp });

      console.log("response-> verify OTP redux", response)
      localStorage.setItem("userAuth", 'hello world');
      localStorage.setItem("accessToken", response.data.accessToken);
      if (response.data.success) {
        return {
          message: response.data.message,
          verified: true,
        };
      }
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || "OTP verification failed",
      });
    }
  }
);

export const fetchCurrentUser = createAsyncThunk(
  "auth/fetchCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/auth/me");
      console.log("Current user fetched:", response.data);
      if (response.data.success && response.data.user) {
        // Check if user is blocked
        if (response.data.user.isBlocked) {
          localStorage.removeItem("accessToken");
          return rejectWithValue({
            message: "Your account has been blocked. Please contact support.",
            isBlocked: true,
          });
        }
        return response.data.user;
      } else {
        localStorage.removeItem("accessToken");
        return rejectWithValue({
          message: "Failed to fetch user data",
        });
      }
    } catch (error) {
      console.log("Error fetching current user:", error);

      // Check if error is due to blocked account
      if (error.response?.data?.isBlocked) {
        localStorage.removeItem("accessToken");
        return rejectWithValue({
          message: error.response.data.message || "Your account has been blocked.",
          isBlocked: true,
        });
      }

      localStorage.removeItem("accessToken");
      return rejectWithValue({
        message: "Failed to fetch user data",
      });
    }
  }
);

export const googleAuth = createAsyncThunk(
  "auth/googleAuth",
  async ({ token, role }, { rejectWithValue }) => {
    try {
      const endpoint =
        role === "instructor"
          ? "/auth/instructor/google"
          : "/auth/student/google";
      const response = await api.post(endpoint, { token });

      console.log(response.data)
      if (response.data.success) {
        const accessToken = response.data.accessToken;
        localStorage.setItem("accessToken", accessToken);
        console.log("Google auth successful, token stored:", accessToken);
        return {
          user: response.data.user || { role },
          token: accessToken,
          role,
        };
      }
    } catch (error) {
      return rejectWithValue({
        message:
          error.response?.data?.message || "Google authentication failed",
      });
    }
  }
);

const initialState = {
  user: null,
  accessToken: localStorage.getItem("accessToken"),
  isAuthenticated: !!localStorage.getItem("accessToken"),
  loading: false,
  error: null,
  requiresVerification: false,
  verificationEmail: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.error = null;
      state.requiresVerification = false;
      state.verificationEmail = null;
      localStorage.removeItem("accessToken");
      localStorage.removeItem("userAuth");
      console.log("User logged out");
    },
    clearError: (state) => {
      state.error = null;
    },
    setRequiresVerification: (state, action) => {
      state.requiresVerification = true;
      state.verificationEmail = action.payload.email;
    },
    clearVerificationState: (state) => {
      state.requiresVerification = false;
      state.verificationEmail = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login cases
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
        state.error = null;
        state.requiresVerification = false;
        console.log("Login fulfilled, state updated:", state);
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload.message;
        // Clear authentication state on login failure
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
        if (action.payload.requiresVerification) {
          state.requiresVerification = true;
          state.verificationEmail = action.payload.email;
        }
      })

      // Register cases
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        if (action.payload.requiresVerification) {
          state.requiresVerification = true;
          state.verificationEmail = action.payload.email;
        }
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload.message;
      })

      // OTP Verification cases
      .addCase(verifyOTP.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyOTP.fulfilled, (state) => {
        state.loading = false;
        state.requiresVerification = false;
        state.verificationEmail = null;
        state.error = null;
      })
      .addCase(verifyOTP.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload.message;
      })

      // Fetch current user cases
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        console.log("Current user fulfilled, state updated:", state);
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.token = null;
        localStorage.removeItem("accessToken");
        console.log("Current user rejected, token cleared");
      })

      // Google Auth cases
      .addCase(googleAuth.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(googleAuth.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
        state.error = null;
        console.log("Google auth fulfilled, state updated:", state);
      })
      .addCase(googleAuth.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload.message;
      });
  },
});

export const {
  logout,
  clearError,
  setRequiresVerification,
  clearVerificationState,
} = authSlice.actions;
export default authSlice.reducer;

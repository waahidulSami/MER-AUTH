import express from "express";
import {
  login,
  logout,
  register,
  sendVerfyOtp,
  verfyEmail,
  isAuthenticated,
  sendResetOtp,
  resetPassword,
  refreshToken,
} from "../controller/auth.Controllers.js";
import userAuth from "../middleware/auth.midel.js";
import { authLimiter, otpLimiter } from "../middleware/rateLimiter.js";

const authRouter = express.Router();

authRouter.post("/register", authLimiter, register);
authRouter.post("/login", authLimiter, login);
authRouter.post("/logout", logout);
authRouter.post("/refresh-token", refreshToken);
authRouter.post("/send-verify-otp", userAuth, otpLimiter, sendVerfyOtp);
authRouter.post("/verfiy-account", userAuth, verfyEmail);
authRouter.get("/is-Auth", userAuth, isAuthenticated);
authRouter.post("/send-reset-otp", otpLimiter, sendResetOtp);
authRouter.post("/reset-password", resetPassword);

export default authRouter;

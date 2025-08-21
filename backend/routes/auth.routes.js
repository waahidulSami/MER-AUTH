import express from "express";
import {
  login,
  logout,
  register,
  sendVerfyOtp,
  verfyEmail,
  isAuthenticated,
  sendResetOtp,
  resetPassword
} from "../controller/auth.Controllers.js";
import userAuth from "../middleware/auth.midel.js";

const authRouter = express.Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/logout", logout);
authRouter.post("/send-verify-otp", userAuth, sendVerfyOtp);
authRouter.post("/verfiy-account", userAuth, verfyEmail);
authRouter.get("/is-Auth", userAuth, isAuthenticated);
authRouter.post("/send-reset-otp", userAuth, sendResetOtp);
authRouter.post("/reset-password", userAuth, resetPassword);




export default authRouter;

import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import userModel from "../model/user.model.js";
import transporter from "../Config/nodemailer.js";
import { EMAIL_VERIFY_TEMPLATE, PASSWORD_RESET_TEMPLATE } from "../Config/emailTemplates.js";

const isDev = process.env.NODE_ENV !== "production";

// Cookie options for Access Token (short-lived, 15m)
const accessTokenCookieOptions = {
  httpOnly: true,
  secure: !isDev,
  sameSite: isDev ? "lax" : "lax", // Use lax for strict security unless cross-domain setup requires explicit origin check
  maxAge: 15 * 60 * 1000,
};

// Cookie options for Refresh Token (long-lived, 7d)
const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: !isDev,
  sameSite: isDev ? "lax" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "15m" });
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId, salt: crypto.randomBytes(16).toString("hex") },
    process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET + "_refresh",
    { expiresIn: "7d" }
  );
};

const hashOtp = (otp) => {
  return crypto.createHash("sha256").update(otp).digest("hex");
};

const compareOtp = (inputOtp, hashedOtp) => {
  if (!inputOtp || !hashedOtp) return false;
  const inputHash = hashOtp(String(inputOtp));
  try {
    const bufA = Buffer.from(inputHash);
    const bufB = Buffer.from(hashedOtp);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
};

const sanitizeString = (val) => (typeof val === "string" ? val.trim() : "");

export const register = async (req, res) => {
  let { name, email, password } = req.body;

  name = sanitizeString(name);
  email = sanitizeString(email).toLowerCase();

  if (!name || !email || typeof password !== "string" || !password) {
    return res.status(400).json({ success: false, message: "All fields are required and must be valid strings" });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
  }

  try {
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "User already exists" });
    }

    const hashPassword = await bcrypt.hash(password, 10);
    const user = new userModel({ name, email, password: hashPassword });

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("accessToken", accessToken, accessTokenCookieOptions);
    res.cookie("token", accessToken, accessTokenCookieOptions);
    res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);

    const mailOptions = {
      from: process.env.SENDER_EMAIL || "noreply@example.com",
      to: email,
      subject: "Welcome to our platform",
      text: `Hello ${name}, your account has been created with email: ${email}`,
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (err) {
      console.error("Email sending error:", err.message);
    }

    return res.status(201).json({ success: true, message: "User registered successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const login = async (req, res) => {
  let { email, password } = req.body;

  email = sanitizeString(email).toLowerCase();

  if (!email || typeof password !== "string" || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required" });
  }

  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("accessToken", accessToken, accessTokenCookieOptions);
    res.cookie("token", accessToken, accessTokenCookieOptions);
    res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);

    return res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const refreshToken = async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken;

  if (!incomingRefreshToken || typeof incomingRefreshToken !== "string") {
    return res.status(401).json({ success: false, message: "Refresh token missing" });
  }

  try {
    const decoded = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET + "_refresh"
    );

    const user = await userModel.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid user session" });
    }

    // Refresh Token Reuse Detection:
    // If incoming refresh token is valid JWT but does not match DB, reuse/theft is suspected!
    if (user.refreshToken !== incomingRefreshToken) {
      // Invalidate existing session to protect user
      user.refreshToken = "";
      await user.save();

      const clearCookieOptions = {
        httpOnly: true,
        secure: !isDev,
        sameSite: isDev ? "lax" : "lax",
      };

      res.clearCookie("accessToken", clearCookieOptions);
      res.clearCookie("token", clearCookieOptions);
      res.clearCookie("refreshToken", clearCookieOptions);

      return res.status(401).json({ success: false, message: "Refresh token reused or revoked. Session cleared." });
    }

    // Rotate refresh token: issue new pair
    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    user.refreshToken = newRefreshToken;
    await user.save();

    res.cookie("accessToken", newAccessToken, accessTokenCookieOptions);
    res.cookie("token", newAccessToken, accessTokenCookieOptions);
    res.cookie("refreshToken", newRefreshToken, refreshTokenCookieOptions);

    return res.json({ success: true, message: "Token refreshed successfully" });
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid or expired refresh token" });
  }
};

export const logout = async (req, res) => {
  try {
    const { refreshToken: currentRefreshToken } = req.cookies;
    if (currentRefreshToken && typeof currentRefreshToken === "string") {
      const user = await userModel.findOne({ refreshToken: currentRefreshToken });
      if (user) {
        user.refreshToken = "";
        await user.save();
      }
    }

    const clearCookieOptions = {
      httpOnly: true,
      secure: !isDev,
      sameSite: isDev ? "lax" : "lax",
    };

    res.clearCookie("accessToken", clearCookieOptions);
    res.clearCookie("token", clearCookieOptions);
    res.clearCookie("refreshToken", clearCookieOptions);

    return res.json({ success: true, message: "Logged out" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const sendVerfyOtp = async (req, res) => {
  try {
    const { userId } = req;

    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.isAccountVerified) {
      return res.status(400).json({ success: false, message: "Account already verified" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.verifyOtp = hashOtp(otp);
    user.verifyOtpExpireAt = Date.now() + 5 * 60 * 1000; // 5 mins
    user.verifyOtpAttempts = 0; // reset failed attempts

    await user.save();

    const mailOptions = {
      from: process.env.SENDER_EMAIL || "noreply@example.com",
      to: user.email,
      subject: "Account verification OTP",
      html: EMAIL_VERIFY_TEMPLATE.replace("{{otp}}", otp).replace("{{email}}", user.email),
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (err) {
      console.error("Email sending error:", err.message);
    }

    return res.json({
      success: true,
      message: "Verification OTP sent to email",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const verfyEmail = async (req, res) => {
  const { userId } = req;
  const { otp } = req.body;

  if (!otp || (typeof otp !== "string" && typeof otp !== "number")) {
    return res.status(400).json({ success: false, message: "OTP is required" });
  }

  const strOtp = String(otp).trim();

  try {
    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.verifyOtp) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    // Check expiration BEFORE validating OTP value
    if (user.verifyOtpExpireAt < Date.now()) {
      user.verifyOtp = "";
      user.verifyOtpExpireAt = 0;
      user.verifyOtpAttempts = 0;
      await user.save();
      return res.status(400).json({ success: false, message: "OTP has expired" });
    }

    // Check attempt limits (max 3 failed attempts)
    if (user.verifyOtpAttempts >= 3) {
      user.verifyOtp = "";
      user.verifyOtpExpireAt = 0;
      user.verifyOtpAttempts = 0;
      await user.save();
      return res.status(400).json({ success: false, message: "Too many failed attempts. Please request a new OTP." });
    }

    if (!compareOtp(strOtp, user.verifyOtp)) {
      user.verifyOtpAttempts = (user.verifyOtpAttempts || 0) + 1;
      await user.save();
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    // Single-use: Clear OTP immediately upon successful verification
    user.isAccountVerified = true;
    user.verifyOtp = "";
    user.verifyOtpExpireAt = 0;
    user.verifyOtpAttempts = 0;

    await user.save();
    return res.json({ success: true, message: "Email verified successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const isAuthenticated = async (req, res) => {
  try {
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const sendResetOtp = async (req, res) => {
  let { email } = req.body;
  email = sanitizeString(email).toLowerCase();

  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required" });
  }

  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.resetOtp = hashOtp(otp);
    user.resetOtpExpireAt = Date.now() + 5 * 60 * 1000;
    user.resetOtpAttempts = 0;

    await user.save();

    const mailOptions = {
      from: process.env.SENDER_EMAIL || "noreply@example.com",
      to: user.email,
      subject: "Password reset OTP",
      html: PASSWORD_RESET_TEMPLATE.replace("{{otp}}", otp).replace("{{email}}", user.email),
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (err) {
      console.error("Email sending error:", err.message);
    }

    return res.json({ success: true, message: "OTP sent to your email" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const resetPassword = async (req, res) => {
  let { email, otp, newPassword } = req.body;
  email = sanitizeString(email).toLowerCase();

  if (!email || !otp || typeof newPassword !== "string" || !newPassword) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
  }

  const strOtp = String(otp).trim();

  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.resetOtp) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    // Expiry check first
    if (user.resetOtpExpireAt < Date.now()) {
      user.resetOtp = "";
      user.resetOtpExpireAt = 0;
      user.resetOtpAttempts = 0;
      await user.save();
      return res.status(400).json({ success: false, message: "OTP has expired" });
    }

    // Max 3 failed attempts check
    if (user.resetOtpAttempts >= 3) {
      user.resetOtp = "";
      user.resetOtpExpireAt = 0;
      user.resetOtpAttempts = 0;
      await user.save();
      return res.status(400).json({ success: false, message: "Too many failed attempts. Please request a new OTP." });
    }

    if (!compareOtp(strOtp, user.resetOtp)) {
      user.resetOtpAttempts = (user.resetOtpAttempts || 0) + 1;
      await user.save();
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    const hashPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashPassword;
    user.resetOtp = "";
    user.resetOtpExpireAt = 0;
    user.resetOtpAttempts = 0;
    user.refreshToken = ""; // Invalidate refresh token on password change to force re-login

    await user.save();

    return res.json({ success: true, message: "Password has been reset successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

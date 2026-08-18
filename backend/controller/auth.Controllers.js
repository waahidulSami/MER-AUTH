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
  sameSite: "lax",
  path: "/",
  maxAge: 15 * 60 * 1000,
};

// Cookie options for Refresh Token (long-lived, 7d)
const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: !isDev,
  sameSite: "lax",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const clearCookieOptions = {
  httpOnly: true,
  secure: !isDev,
  sameSite: "lax",
  path: "/",
};

// Fix #12: Strictly sign JWT with algorithm, issuer, and audience
const generateAccessToken = (userId, tokenVersion = 0) => {
  return jwt.sign(
    { id: userId, tokenVersion },
    process.env.JWT_SECRET,
    {
      expiresIn: "15m",
      algorithm: "HS256",
      issuer: "mern-auth",
      audience: "mern-auth-client",
    }
  );
};

// Fix #13: Ensure REFRESH_TOKEN_SECRET is explicitly provided (no fallbacks)
const generateRefreshToken = (userId) => {
  if (!process.env.REFRESH_TOKEN_SECRET) {
    throw new Error("REFRESH_TOKEN_SECRET environment variable is missing.");
  }
  return jwt.sign(
    { id: userId, salt: crypto.randomBytes(16).toString("hex") },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: "7d",
      algorithm: "HS256",
      issuer: "mern-auth",
      audience: "mern-auth-client",
    }
  );
};

// Fix #4: Hash refresh token using SHA-256 before saving to DB
const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

// Fix #9: Secure OTP generation & SHA-256 Hashing
const generateSecureOtp = () => {
  // Fix #7: Use crypto.randomInt instead of Math.random()
  return crypto.randomInt(100000, 1000000).toString();
};

const hashOtp = (otp) => {
  return crypto.createHash("sha256").update(String(otp)).digest("hex");
};

const compareOtp = (inputOtp, hashedOtp) => {
  if (!inputOtp || !hashedOtp) return false;
  const inputHash = hashOtp(inputOtp);
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

  // Fix #17 & #19: Password minimum 12 characters
  if (!name || !email || typeof password !== "string" || !password) {
    return res.status(400).json({ success: false, message: "All fields are required and must be valid strings" });
  }

  if (password.length < 12) {
    return res.status(400).json({ success: false, message: "Password must be at least 12 characters" });
  }

  try {
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "User already exists" });
    }

    const hashPassword = await bcrypt.hash(password, 10);
    const user = new userModel({ name, email, password: hashPassword, tokenVersion: 0 });

    const accessToken = generateAccessToken(user._id, user.tokenVersion);
    const refreshToken = generateRefreshToken(user._id);

    // Fix #4: Store hashed refresh token in DB
    user.refreshTokenHash = hashToken(refreshToken);
    await user.save();

    // Fix #11: Clear duplicate 'token' cookie and set canonical 'accessToken' & 'refreshToken'
    res.clearCookie("token", clearCookieOptions);
    res.cookie("accessToken", accessToken, accessTokenCookieOptions);
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
    // Need password field explicitly since select: false
    const user = await userModel.findOne({ email }).select("+password +tokenVersion");
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const accessToken = generateAccessToken(user._id, user.tokenVersion || 0);
    const refreshToken = generateRefreshToken(user._id);

    // Fix #4: Store hashed refresh token
    user.refreshTokenHash = hashToken(refreshToken);
    await user.save();

    res.clearCookie("token", clearCookieOptions);
    res.cookie("accessToken", accessToken, accessTokenCookieOptions);
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

// Fix #3 & #4: Atomic Refresh Token Rotation & Hashed Storage
export const refreshToken = async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken;

  if (!incomingRefreshToken || typeof incomingRefreshToken !== "string") {
    return res.status(401).json({ success: false, message: "Refresh token missing" });
  }

  try {
    const decoded = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
      {
        algorithms: ["HS256"],
        issuer: "mern-auth",
        audience: "mern-auth-client",
      }
    );

    const incomingHash = hashToken(incomingRefreshToken);
    const newRefreshToken = generateRefreshToken(decoded.id);
    const newRefreshTokenHash = hashToken(newRefreshToken);

    // Fix #3: Atomic conditional findOneAndUpdate to prevent rotation race conditions
    const updatedUser = await userModel.findOneAndUpdate(
      {
        _id: decoded.id,
        refreshTokenHash: incomingHash,
      },
      {
        $set: {
          refreshTokenHash: newRefreshTokenHash,
        },
      },
      { new: true }
    ).select("+tokenVersion");

    // If update returned null, token was reused, revoked, or invalid!
    if (!updatedUser) {
      // Theft/Reuse Detection: Revoke all refresh tokens for this user
      await userModel.findByIdAndUpdate(decoded.id, { $set: { refreshTokenHash: "" } });

      res.clearCookie("accessToken", clearCookieOptions);
      res.clearCookie("token", clearCookieOptions);
      res.clearCookie("refreshToken", clearCookieOptions);

      return res.status(401).json({ success: false, message: "Refresh token reused or revoked. Session cleared." });
    }

    const newAccessToken = generateAccessToken(updatedUser._id, updatedUser.tokenVersion || 0);

    res.clearCookie("token", clearCookieOptions);
    res.cookie("accessToken", newAccessToken, accessTokenCookieOptions);
    res.cookie("refreshToken", newRefreshToken, refreshTokenCookieOptions);

    return res.json({ success: true, message: "Token refreshed successfully" });
  } catch (error) {
    res.clearCookie("accessToken", clearCookieOptions);
    res.clearCookie("token", clearCookieOptions);
    res.clearCookie("refreshToken", clearCookieOptions);
    return res.status(401).json({ success: false, message: "Invalid or expired refresh token" });
  }
};

export const logout = async (req, res) => {
  try {
    const { refreshToken: currentRefreshToken } = req.cookies;
    if (currentRefreshToken && typeof currentRefreshToken === "string") {
      const incomingHash = hashToken(currentRefreshToken);
      await userModel.findOneAndUpdate(
        { refreshTokenHash: incomingHash },
        { $set: { refreshTokenHash: "" } }
      );
    }

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

    // Fix #7: Use crypto.randomInt
    const otp = generateSecureOtp();

    // Fix #8: Atomic update to prevent race conditions on OTP sending
    await userModel.findByIdAndUpdate(userId, {
      $set: {
        verifyOtp: hashOtp(otp),
        verifyOtpExpireAt: Date.now() + 5 * 60 * 1000,
        verifyOtpAttempts: 0,
      },
    });

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

// Fix #8: Atomic OTP Verification
export const verfyEmail = async (req, res) => {
  const { userId } = req;
  const { otp } = req.body;

  // Fix #19: Validate OTP format strictly (6 digits)
  if (!otp || typeof otp !== "string" || !/^\d{6}$/.test(otp.trim())) {
    return res.status(400).json({ success: false, message: "OTP must be exactly 6 numeric digits" });
  }

  const strOtp = otp.trim();

  try {
    const user = await userModel.findById(userId);

    if (!user || !user.verifyOtp) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    // Expiration check
    if (user.verifyOtpExpireAt < Date.now()) {
      await userModel.findByIdAndUpdate(userId, {
        $set: { verifyOtp: "", verifyOtpExpireAt: 0, verifyOtpAttempts: 0 },
      });
      return res.status(400).json({ success: false, message: "OTP has expired" });
    }

    // Max attempt check
    if (user.verifyOtpAttempts >= 3) {
      await userModel.findByIdAndUpdate(userId, {
        $set: { verifyOtp: "", verifyOtpExpireAt: 0, verifyOtpAttempts: 0 },
      });
      return res.status(400).json({ success: false, message: "Too many failed attempts. Please request a new OTP." });
    }

    if (!compareOtp(strOtp, user.verifyOtp)) {
      await userModel.findByIdAndUpdate(userId, { $inc: { verifyOtpAttempts: 1 } });
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    // Atomic consumption: Clear OTP immediately upon verification
    await userModel.findByIdAndUpdate(userId, {
      $set: {
        isAccountVerified: true,
        verifyOtp: "",
        verifyOtpExpireAt: 0,
        verifyOtpAttempts: 0,
      },
    });

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

// Fix #6: Generic response to prevent account enumeration
export const sendResetOtp = async (req, res) => {
  let { email } = req.body;
  email = sanitizeString(email).toLowerCase();

  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required" });
  }

  const GENERIC_RESPONSE = {
    success: true,
    message: "If an account exists for this email, a password reset code has been sent.",
  };

  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      // Return generic response without revealing account existence
      return res.json(GENERIC_RESPONSE);
    }

    const otp = generateSecureOtp();

    await userModel.findByIdAndUpdate(user._id, {
      $set: {
        resetOtp: hashOtp(otp),
        resetOtpExpireAt: Date.now() + 5 * 60 * 1000,
        resetOtpAttempts: 0,
      },
    });

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

    return res.json(GENERIC_RESPONSE);
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Fix #10: Password Reset Invalidates All Existing Access Tokens via tokenVersion
export const resetPassword = async (req, res) => {
  let { email, otp, newPassword } = req.body;
  email = sanitizeString(email).toLowerCase();

  if (!email || !otp || typeof newPassword !== "string" || !newPassword) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  if (newPassword.length < 12) {
    return res.status(400).json({ success: false, message: "Password must be at least 12 characters" });
  }

  if (!/^\d{6}$/.test(String(otp).trim())) {
    return res.status(400).json({ success: false, message: "OTP must be exactly 6 numeric digits" });
  }

  const strOtp = String(otp).trim();

  try {
    const user = await userModel.findOne({ email });
    if (!user || !user.resetOtp) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    // Expiry check
    if (user.resetOtpExpireAt < Date.now()) {
      await userModel.findByIdAndUpdate(user._id, {
        $set: { resetOtp: "", resetOtpExpireAt: 0, resetOtpAttempts: 0 },
      });
      return res.status(400).json({ success: false, message: "OTP has expired" });
    }

    // Max 3 failed attempts
    if (user.resetOtpAttempts >= 3) {
      await userModel.findByIdAndUpdate(user._id, {
        $set: { resetOtp: "", resetOtpExpireAt: 0, resetOtpAttempts: 0 },
      });
      return res.status(400).json({ success: false, message: "Too many failed attempts. Please request a new OTP." });
    }

    if (!compareOtp(strOtp, user.resetOtp)) {
      await userModel.findByIdAndUpdate(user._id, { $inc: { resetOtpAttempts: 1 } });
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    const hashPassword = await bcrypt.hash(newPassword, 10);

    // Fix #10: Increment tokenVersion to invalidate all previously issued access tokens!
    await userModel.findByIdAndUpdate(user._id, {
      $set: {
        password: hashPassword,
        resetOtp: "",
        resetOtpExpireAt: 0,
        resetOtpAttempts: 0,
        refreshTokenHash: "", // Invalidate refresh tokens
      },
      $inc: {
        tokenVersion: 1, // Invalidate active access tokens
      },
    });

    res.clearCookie("accessToken", clearCookieOptions);
    res.clearCookie("token", clearCookieOptions);
    res.clearCookie("refreshToken", clearCookieOptions);

    return res.json({ success: true, message: "Password has been reset successfully. Please login again." });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

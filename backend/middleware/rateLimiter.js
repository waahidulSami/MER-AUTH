import rateLimit from "express-rate-limit";

const isTest = process.env.NODE_ENV === "test";

// Rate limiter for general auth endpoints (e.g. login, register)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 1000 : 10, // Avoid hitting rate limits during general unit testing unless explicitly tested
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts from this IP, please try again after 15 minutes.",
  },
});

// Stricter rate limiter for OTP generation to prevent abuse/spam
export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 1000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many OTP requests from this IP, please try again after 15 minutes.",
  },
});

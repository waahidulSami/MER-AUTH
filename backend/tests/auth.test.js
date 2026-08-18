import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import transporter from "../Config/nodemailer.js";
import app from "../server.js";
import userModel from "../model/user.model.js";

let mongoServer;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test_jwt_secret_123";
  process.env.REFRESH_TOKEN_SECRET = "test_refresh_token_secret_123";
  process.env.SENDER_EMAIL = "test@example.com";

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await userModel.deleteMany({});
  vi.spyOn(transporter, "sendMail").mockResolvedValue({ messageId: "test_mail_id" });
});

describe("Authentication & Security Test Suite", () => {
  const testUser = {
    name: "Test User",
    email: "test@example.com",
    password: "password123",
  };

  it("1. should register a new user successfully and set HttpOnly cookies", async () => {
    const res = await request(app).post("/api/auth/register").send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.includes("accessToken") && c.includes("HttpOnly"))).toBe(true);
    expect(cookies.some((c) => c.includes("refreshToken") && c.includes("HttpOnly"))).toBe(true);
    expect(transporter.sendMail).toHaveBeenCalled();
  });

  it("2. should prevent duplicate registration and normalize email case", async () => {
    await request(app).post("/api/auth/register").send(testUser);
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...testUser, email: "TEST@EXAMPLE.COM" });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("User already exists");
  });

  it("3. should login registered user with valid credentials", async () => {
    await request(app).post("/api/auth/register").send(testUser);

    const res = await request(app).post("/api/auth/login").send({
      email: testUser.email,
      password: testUser.password,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(testUser.email);
  });

  it("4. should reject login with wrong password", async () => {
    await request(app).post("/api/auth/register").send(testUser);

    const res = await request(app).post("/api/auth/login").send({
      email: testUser.email,
      password: "wrongpassword",
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("5. should reject unauthorized request to protected route when cookie is missing", async () => {
    const res = await request(app).get("/api/user/data");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("Not authorized");
  });

  it("6. should reject protected route access with invalid/malformed JWT", async () => {
    const res = await request(app)
      .get("/api/user/data")
      .set("Cookie", ["accessToken=invalid_malformed_jwt_token"]);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("7. should reject protected route access with expired JWT access token", async () => {
    const expiredToken = jwt.sign(
      { id: new mongoose.Types.ObjectId() },
      process.env.JWT_SECRET,
      { expiresIn: "-1s" }
    );

    const res = await request(app)
      .get("/api/user/data")
      .set("Cookie", [`accessToken=${expiredToken}`]);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("8. should refresh access token using valid refresh token cookie", async () => {
    const regRes = await request(app).post("/api/auth/register").send(testUser);
    const cookies = regRes.headers["set-cookie"];

    const res = await request(app)
      .post("/api/auth/refresh-token")
      .set("Cookie", cookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("9. should detect refresh token reuse, invalidate session, and clear cookies", async () => {
    const regRes = await request(app).post("/api/auth/register").send(testUser);
    const originalCookies = regRes.headers["set-cookie"];
    const originalRefreshCookieStr = originalCookies.find((c) => c.startsWith("refreshToken=")).split(";")[0];

    // First refresh (Rotates token in DB & returns NEW set-cookie)
    const firstRefreshRes = await request(app)
      .post("/api/auth/refresh-token")
      .set("Cookie", [originalRefreshCookieStr]);

    expect(firstRefreshRes.status).toBe(200);

    // Wait 1 second so new refresh token gets a new JWT iat timestamp
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Second refresh using the STOLEN/OLD original refresh token (Reuse detection!)
    const reuseRes = await request(app)
      .post("/api/auth/refresh-token")
      .set("Cookie", [originalRefreshCookieStr]);

    expect(reuseRes.status).toBe(401);
    expect(reuseRes.body.message).toContain("reused or revoked");

    // Verify session in DB was cleared
    const userInDb = await userModel.findOne({ email: testUser.email });
    expect(userInDb.refreshToken).toBe("");
  });

  it("10. should handle OTP verification lifecycle, hashed storage, and single-use invalidation", async () => {
    const regRes = await request(app).post("/api/auth/register").send(testUser);
    const cookies = regRes.headers["set-cookie"];

    await request(app).post("/api/auth/send-verify-otp").set("Cookie", cookies);

    const userInDb = await userModel.findOne({ email: testUser.email });
    expect(userInDb.verifyOtp).toHaveLength(64); // SHA-256 hash length

    const testOtp = "123456";
    const crypto = await import("crypto");
    userInDb.verifyOtp = crypto.createHash("sha256").update(testOtp).digest("hex");
    userInDb.verifyOtpExpireAt = Date.now() + 60000;
    await userInDb.save();

    // Verify OTP successfully
    const verifyRes = await request(app)
      .post("/api/auth/verfiy-account")
      .set("Cookie", cookies)
      .send({ otp: testOtp });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);

    // Verify single-use: DB OTP fields cleared
    const updatedUser = await userModel.findOne({ email: testUser.email });
    expect(updatedUser.isAccountVerified).toBe(true);
    expect(updatedUser.verifyOtp).toBe("");

    // Verify OTP reuse attempt fails
    const reuseOtpRes = await request(app)
      .post("/api/auth/verfiy-account")
      .set("Cookie", cookies)
      .send({ otp: testOtp });

    expect(reuseOtpRes.status).toBe(400);
  });

  it("11. should enforce expired OTP rejection", async () => {
    const regRes = await request(app).post("/api/auth/register").send(testUser);
    const cookies = regRes.headers["set-cookie"];

    await request(app).post("/api/auth/send-verify-otp").set("Cookie", cookies);

    const userInDb = await userModel.findOne({ email: testUser.email });
    userInDb.verifyOtpExpireAt = Date.now() - 1000; // Expired 1 second ago
    await userInDb.save();

    const verifyRes = await request(app)
      .post("/api/auth/verfiy-account")
      .set("Cookie", cookies)
      .send({ otp: "123456" });

    expect(verifyRes.status).toBe(400);
    expect(verifyRes.body.message).toContain("expired");
  });

  it("12. should block OTP verification after max 3 failed attempts", async () => {
    const regRes = await request(app).post("/api/auth/register").send(testUser);
    const cookies = regRes.headers["set-cookie"];

    await request(app).post("/api/auth/send-verify-otp").set("Cookie", cookies);

    for (let i = 0; i < 3; i++) {
      await request(app)
        .post("/api/auth/verfiy-account")
        .set("Cookie", cookies)
        .send({ otp: "000000" });
    }

    const fourthAttempt = await request(app)
      .post("/api/auth/verfiy-account")
      .set("Cookie", cookies)
      .send({ otp: "000000" });

    expect(fourthAttempt.status).toBe(400);
    expect(fourthAttempt.body.message).toContain("Too many failed attempts");
  });

  it("13. should handle password reset flow with OTP", async () => {
    await request(app).post("/api/auth/register").send(testUser);

    await request(app).post("/api/auth/send-reset-otp").send({ email: testUser.email });

    const userInDb = await userModel.findOne({ email: testUser.email });
    const crypto = await import("crypto");
    const testOtp = "654321";
    userInDb.resetOtp = crypto.createHash("sha256").update(testOtp).digest("hex");
    userInDb.resetOtpExpireAt = Date.now() + 60000;
    await userInDb.save();

    const resetRes = await request(app).post("/api/auth/reset-password").send({
      email: testUser.email,
      otp: testOtp,
      newPassword: "newpassword123",
    });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);

    // Verify login with new password
    const loginRes = await request(app).post("/api/auth/login").send({
      email: testUser.email,
      password: "newpassword123",
    });
    expect(loginRes.status).toBe(200);
  });

  it("14. should validate CORS Origin header policies", async () => {
    const res = await request(app)
      .get("/")
      .set("Origin", "https://unauthorized-malicious-domain.com");

    expect(res.status).toBe(500); // Express CORS middleware callback error
  });

  it("15. should trigger rate limiter when limit is exceeded on isolated endpoint", async () => {
    const customLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 2,
      message: { success: false, message: "Too many attempts" },
    });

    const mockExpress = (await import("express")).default;
    const testApp = mockExpress();
    testApp.post("/test-limit", customLimiter, (req, res) => res.json({ success: true }));

    await request(testApp).post("/test-limit");
    await request(testApp).post("/test-limit");
    const thirdRes = await request(testApp).post("/test-limit");

    expect(thirdRes.status).toBe(429);
    expect(thirdRes.body.message).toContain("Too many attempts");
  });
});

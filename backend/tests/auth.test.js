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
    password: "password12345", // Minimum 12 characters
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
      password: "wrongpassword123",
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
      { id: new mongoose.Types.ObjectId(), tokenVersion: 0 },
      process.env.JWT_SECRET,
      { expiresIn: "-1s", algorithm: "HS256", issuer: "mern-auth", audience: "mern-auth-client" }
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

  it("9. should perform atomic refresh token rotation & detect reuse", async () => {
    const regRes = await request(app).post("/api/auth/register").send(testUser);
    const originalCookies = regRes.headers["set-cookie"];
    const originalRefreshCookieStr = originalCookies.find((c) => c.startsWith("refreshToken=")).split(";")[0];

    // First refresh (Atomic rotation in DB)
    const firstRefreshRes = await request(app)
      .post("/api/auth/refresh-token")
      .set("Cookie", [originalRefreshCookieStr]);

    expect(firstRefreshRes.status).toBe(200);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Second refresh using the OLD refresh token (Reuse detection!)
    const reuseRes = await request(app)
      .post("/api/auth/refresh-token")
      .set("Cookie", [originalRefreshCookieStr]);

    expect(reuseRes.status).toBe(401);
    expect(reuseRes.body.message).toContain("reused or revoked");

    // Verify DB hash was revoked
    const userInDb = await userModel.findOne({ email: testUser.email });
    expect(userInDb.refreshTokenHash).toBe("");
  });

  it("10. should prevent password reset account enumeration by returning generic response", async () => {
    const existingRes = await request(app)
      .post("/api/auth/send-reset-otp")
      .send({ email: "nonexistent@example.com" });

    expect(existingRes.status).toBe(200);
    expect(existingRes.body.success).toBe(true);
    expect(existingRes.body.message).toContain("If an account exists");
  });

  it("11. should invalidate access tokens when password is reset (tokenVersion increment)", async () => {
    const regRes = await request(app).post("/api/auth/register").send(testUser);
    const oldCookies = regRes.headers["set-cookie"];

    // Set known OTP hash
    const userInDb = await userModel.findOne({ email: testUser.email });
    const crypto = await import("crypto");
    const testOtp = "123456";
    userInDb.resetOtp = crypto.createHash("sha256").update(testOtp).digest("hex");
    userInDb.resetOtpExpireAt = Date.now() + 60000;
    await userInDb.save();

    // Reset password
    await request(app).post("/api/auth/reset-password").send({
      email: testUser.email,
      otp: testOtp,
      newPassword: "newpassword12345",
    });

    // Access protected route with OLD access token (should fail because tokenVersion incremented)
    const oldAccessRes = await request(app)
      .get("/api/user/data")
      .set("Cookie", oldCookies);

    expect(oldAccessRes.status).toBe(401);
    expect(oldAccessRes.body.message).toContain("Session expired or password changed");
  });

  it("12. should handle concurrent refresh requests safely", async () => {
    const regRes = await request(app).post("/api/auth/register").send(testUser);
    const cookies = regRes.headers["set-cookie"];

    // Fire 2 concurrent refresh requests
    const [req1, req2] = await Promise.all([
      request(app).post("/api/auth/refresh-token").set("Cookie", cookies),
      request(app).post("/api/auth/refresh-token").set("Cookie", cookies),
    ]);

    const statuses = [req1.status, req2.status];
    expect(statuses).toContain(200);
    expect(statuses).toContain(401); // Exactly one succeeds, one rejected due to atomic update
  });
});

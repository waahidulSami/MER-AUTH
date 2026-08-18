import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import express from "express";
import cookieParser from "cookie-parser";
import authRouter from "../routes/auth.routes.js";
import userRouter from "../routes/user.routes.js";
import userModel from "../model/user.model.js";

let mongoServer;
let app;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test_jwt_secret_123";
  process.env.REFRESH_TOKEN_SECRET = "test_refresh_token_secret_123";
  process.env.SENDER_EMAIL = "test@example.com";

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/auth", authRouter);
  app.use("/api/user", userRouter);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await userModel.deleteMany({});
});

describe("Authentication API Integration Tests", () => {
  const testUser = {
    name: "Test User",
    email: "test@example.com",
    password: "password123",
  };

  it("should register a new user successfully and return tokens", async () => {
    const res = await request(app).post("/api/auth/register").send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.includes("accessToken"))).toBe(true);
    expect(cookies.some((c) => c.includes("refreshToken"))).toBe(true);
  });

  it("should prevent duplicate registration", async () => {
    await request(app).post("/api/auth/register").send(testUser);
    const res = await request(app).post("/api/auth/register").send(testUser);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("User already exists");
  });

  it("should login registered user with valid credentials", async () => {
    await request(app).post("/api/auth/register").send(testUser);

    const res = await request(app).post("/api/auth/login").send({
      email: testUser.email,
      password: testUser.password,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(testUser.email);
  });

  it("should reject login with wrong password", async () => {
    await request(app).post("/api/auth/register").send(testUser);

    const res = await request(app).post("/api/auth/login").send({
      email: testUser.email,
      password: "wrongpassword",
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should refresh access token using valid refresh token cookie", async () => {
    const regRes = await request(app).post("/api/auth/register").send(testUser);
    const cookies = regRes.headers["set-cookie"];

    const res = await request(app)
      .post("/api/auth/refresh-token")
      .set("Cookie", cookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("should verify OTP with hashed storage check", async () => {
    const regRes = await request(app).post("/api/auth/register").send(testUser);
    const cookies = regRes.headers["set-cookie"];

    // Send verify OTP
    await request(app).post("/api/auth/send-verify-otp").set("Cookie", cookies);

    // Retrieve user from DB to verify OTP is stored hashed (not plaintext)
    const userInDb = await userModel.findOne({ email: testUser.email });
    expect(userInDb.verifyOtp).toBeDefined();
    expect(userInDb.verifyOtp).not.toHaveLength(6); // Hashed string length is 64 hex chars

    // Attempting incorrect OTP
    const wrongRes = await request(app)
      .post("/api/auth/verfiy-account")
      .set("Cookie", cookies)
      .send({ otp: "000000" });

    expect(wrongRes.status).toBe(400);
    expect(wrongRes.body.message).toBe("Invalid OTP");
  });

  it("should logout user and invalidate refresh token", async () => {
    const regRes = await request(app).post("/api/auth/register").send(testUser);
    const cookies = regRes.headers["set-cookie"];

    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookies);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);

    const userInDb = await userModel.findOne({ email: testUser.email });
    expect(userInDb.refreshToken).toBe("");
  });
});

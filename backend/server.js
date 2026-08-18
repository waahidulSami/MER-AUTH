import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import connectDB from "./Config/mongodb.js";
import { validateEnv } from "./Config/validateEnv.js";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";

dotenv.config();
validateEnv();

const app = express();
const isDev = process.env.NODE_ENV !== "production";

// Configure Express proxy trust for reverse proxies (Render, Nginx, Cloudflare)
if (!isDev) {
  app.set("trust proxy", 1);
}

const allowedOrigins = [
  "https://mer-auth-1.onrender.com",
  "http://localhost:5173",
  "http://localhost:3000",
];

app.use(helmet());
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("API is running!");
});

app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);

// Ensure MongoDB is connected BEFORE starting the HTTP server
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== "test") {
  connectDB()
    .then(() => {
      app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch((err) => {
      console.error("Database connection failed. Exiting process.", err);
      process.exit(1);
    });
}

export default app;

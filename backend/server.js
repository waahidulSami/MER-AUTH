import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./Config/mongodb.js";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";

dotenv.config();

const app = express();

// middleware
app.use(cors({
  origin: 'http://localhost:5173', // frontend URL
  credentials: true // allow cookies to be sent
}));

app.use(express.json());
app.use(cookieParser()); // ✅ must come before routes

// simple test route
app.get("/", (req, res) => {
  res.send("API is running!");
});

app.use("/api/auth", authRouter);
app.use('/api/user', userRouter)

connectDB();

// server run
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

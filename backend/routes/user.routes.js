import express from "express";
import userAuth from "../middleware/auth.midel.js";
import { getUserData } from "../controller/user.controllers.js";


const userRouter = express.Router()


userRouter.get("/data" , userAuth , getUserData)

export default userRouter
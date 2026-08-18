import jwt from "jsonwebtoken";
import userModel from "../model/user.model.js";

const userAuth = async (req, res, next) => {
  // Fix #11: Only read the canonical cookie 'accessToken'
  const token = req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({ success: false, message: "Not authorized. Please login." });
  }

  try {
    // Fix #12: Restrict algorithm, issuer, and audience explicitly
    const tokenDecode = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: "mern-auth",
      audience: "mern-auth-client",
    });

    if (!tokenDecode.id) {
      return res.status(401).json({ success: false, message: "Not authorized. Please login again." });
    }

    // Fix #10: Verify tokenVersion against database to ensure password reset invalidates old access tokens
    const user = await userModel.findById(tokenDecode.id).select("tokenVersion");
    if (!user || user.tokenVersion !== (tokenDecode.tokenVersion || 0)) {
      return res.status(401).json({ success: false, message: "Session expired or password changed. Please login again." });
    }

    req.userId = tokenDecode.id;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Not authorized. Please login." });
  }
};

export default userAuth;

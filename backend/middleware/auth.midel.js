import jwt from "jsonwebtoken";

const userAuth = async (req, res, next) => {
  const token = req.cookies.accessToken || req.cookies.token;

  if (!token) {
    return res.status(401).json({ success: false, message: "Not authorized. Please login." });
  }

  try {
    const tokenDecode = jwt.verify(token, process.env.JWT_SECRET);

    if (tokenDecode.id) {
      req.userId = tokenDecode.id;
    } else {
      return res.status(401).json({ success: false, message: "Not authorized. Please login again." });
    }

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Not authorized. Please login." });
  }
};

export default userAuth;

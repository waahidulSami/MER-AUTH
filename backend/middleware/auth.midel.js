import jwt from "jsonwebtoken";

const userAuth = (req, res, next) => {
  const { token } = req.cookies;

  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized: Please log in" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.id) {
      req.userId = decoded.id; // store in req.userId, safer than req.body
      next();
    } else {
      return res.status(401).json({ success: false, message: "Unauthorized: Invalid token" });
    }
  } catch (error) {
    return res.status(401).json({ success: false, message: "Unauthorized: Invalid token" });
  }
};

export default userAuth;

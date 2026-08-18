import userModel from "../model/user.model.js";

export const getUserData = async (req, res) => {
  try {
    const { userId } = req;

    // Fix #18: Explicit field selection to prevent sensitive field leaks (password, hashes, tokens)
    const user = await userModel.findById(userId).select("name email isAccountVerified");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      userData: user.name,
      email: user.email,
      isAccountVerify: user.isAccountVerified,
      isAccountVerified: user.isAccountVerified,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

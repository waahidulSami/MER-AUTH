import userModel from "../model/user.model.js";

export const getUserData = async (req, res) => {
  try {
    const { userId } = req;

    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      userData: user.name,
      isAccountVerify: user.isAccountVerify,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

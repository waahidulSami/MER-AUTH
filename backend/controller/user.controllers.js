import userModel from "../model/user.model.js";

export const getUserData =async (req,res)=> {
    try {
        const {userId} = req.body;

        const user = await userModel.findById(userId)

        if (!user) {
            return res.json({success : true, message: 'user not found '})
        }

        res.json({success: true,
            userData:user.name,
            isAccountVerify: user.isAccountVerify
        })

        

    } catch (error) {
        return res.json({success: false, message:error.message})
    }
}


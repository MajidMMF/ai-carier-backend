import axios from "axios";
import { oauth2client } from "../config/googleConfig.js";
import TryCatch from "../middleware/trycatch.js";
import User from "../models/User.model.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { AuthorizationRequest as AuthenticatedRequest } from "../middleware/isAuth.js";
dotenv.config();

export const loginUser = TryCatch(async (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({
            message: "Authorization code is required"
        });
    }

    const googleRes = await oauth2client.getToken(code);

    if (!googleRes.tokens || !googleRes.tokens.access_token) {
        return res.status(400).json({
            message: "Failed to get access token"
        });
    }

    oauth2client.setCredentials(googleRes.tokens);

    const userRes = await axios.get(
        `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${googleRes.tokens.access_token}`
    );

    const { email, name, picture } = userRes.data;

    if (!email) {
        return res.status(400).json({
            message: "Email not found from Google"
        });
    }

    let user = await User.findOne({ email });

    if (!user) {
        user = await User.create({
            name,
            email,
            image: picture
        });
    }

    if (!process.env.JWT_SEC) {
        return res.status(500).json({
            message: "JWT secret not configured"
        });
    }

    const token = jwt.sign(
        { _id: user._id },
        process.env.JWT_SEC,
        { expiresIn: "15d" }
    );

    const userObj: any = user.toObject ? user.toObject() : { ...user };
    if (userObj.freeRequestsUsed === undefined && userObj.freeReqestsUsed !== undefined) {
        userObj.freeRequestsUsed = userObj.freeReqestsUsed;
    }

    res.json({
        message: "User Logged in",
        token,
        user: userObj,
    });
});
export const myProfile = TryCatch(async (req: AuthenticatedRequest, res) => {
    const user = req.user;
    const userObj: any = user && (user as any).toObject ? (user as any).toObject() : { ...(user as any) };
    if (userObj.freeRequestsUsed === undefined && userObj.freeReqestsUsed !== undefined) {
        userObj.freeRequestsUsed = userObj.freeReqestsUsed;
    }
    res.json(userObj);
});

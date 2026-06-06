import jwt from "jsonwebtoken";
import User from "../models/User.model.js";
export const isAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({
                message: "Please Login - No auth header",
            });
            return;
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            res.status(401).json({
                message: "Please Login - Token missing",
            });
            return;
        }
        const decodedData = jwt.verify(token, process.env.JWT_SEC);
        if (!decodedData || !decodedData._id) {
            res.status(401).json({
                message: "Invalid token",
            });
            return;
        }
        const user = await User.findById(decodedData._id);
        if (!user) {
            res.status(401).json({
                message: "expired token",
            });
            return;
        }
        const anyUser = user;
        if (anyUser.freeRequestsUsed === undefined && anyUser.freeReqestsUsed !== undefined) {
            anyUser.freeRequestsUsed = anyUser.freeReqestsUsed;
        }
        req.user = user;
        next();
    }
    catch (error) {
        console.log(error?.message ?? error);
        res.status(401).json({
            message: "Please login",
            error: error?.message ?? null,
        });
    }
};

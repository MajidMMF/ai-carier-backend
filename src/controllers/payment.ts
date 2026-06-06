import { instance } from "../index.js";
import { AuthorizationRequest } from "../middleware/isAuth.js";
import TryCatch from "../middleware/trycatch.js";
import User from "../models/User.model.js";
import crypto from "crypto"

export const checkOut = TryCatch(async (req: AuthorizationRequest, res) => {
    const user_id = req.user?._id;
    if (!user_id) {
        return res.status(400).json({
            message: "No User Id",
        })
    }
    const user = await User.findById(user_id);
    const subTime = user?.subscription ? new Date(user.subscription).getTime() : 0;
    const now = Date.now();
    const isSubscribe = subTime > now;
    if (isSubscribe) {
        return res.status(400).json({
            message: "User already subscribed",
        })
    }
    const { duration } = req.body
    let amount;
    if (duration === 1) {
        amount = Number(299 * 100);
    } else {
        amount = Number(1499 * 100);
    }

    const options = {
        amount,
        currency: "INR",
        notes: {
            user_id: user_id?.toString(),
            duration: duration.toString(),
        }
    }
    const order = await instance.orders.create(options);
    res.status(201).json({
        order
    })
})

export const paymentVerification = TryCatch(async (req: AuthorizationRequest, res) => {
    const user = req.user;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET as string)
        .update(body)
        .digest("hex")

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
        const order = await instance.orders.fetch(razorpay_order_id);
        const duration = Number(order.notes?.duration);

        const now = new Date()
        let expiryDate;

        if (duration === 1) {
            expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        } else {
            expiryDate = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
        }

        const updateUser = await User.findByIdAndUpdate(
            user?._id,
            { subscription: expiryDate },
            { new: true }
        )

        return res.json({
            message: "Subscriptioin purchased successfully",
            updateUser
        })
    } else {
        return res.status(400).json({
            message: "Payment Faild",
        })
    }
})
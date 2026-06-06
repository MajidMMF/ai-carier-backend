import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import userRoutes from "./routes/user.routes.js";
import cors from "cors";
import aiRoutes from "./routes/ai.js";
import paymentRoutes from "./routes/payment.js";
import { errorHandler } from "./middleware/errorHandler.js";
import Razorpay from "razorpay";
dotenv.config();
export const instance = new Razorpay({
    key_id: process.env.RAZORPAY_API_KEY,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});
connectDB();
const app = express();
app.use(express.json({
    limit: "10mb"
}));
app.use(cors());
app.use(express.urlencoded({
    extended: true,
    limit: "10mb"
}));
app.use("/api/user", userRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/payment", paymentRoutes);
app.use(errorHandler);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`server is running on PORT:${PORT} ✅`);
});

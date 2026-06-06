import mongoos from "mongoose";
import dotenv from "dotenv";
dotenv.config();
export const connectDB = async () => {
    try {
        await mongoos.connect(process.env.MONGO_URI, {
            dbName: "carier-ai"
        });
        console.log(`database connected✅📊`);
    }
    catch (error) {
        console.log(error);
    }
};

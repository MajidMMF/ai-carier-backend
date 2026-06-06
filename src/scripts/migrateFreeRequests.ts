import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "../config/db.js";
import User from "../models/User.model.js";

async function migrate() {
  await connectDB();

  const users = await User.find({
    $or: [
      { freeReqestsUsed: { $exists: true } },
      { freeRequestsUsed: { $exists: false } },
    ],
  });

  let updated = 0;

  for (const user of users) {
    const anyUser: any = user;

    if (
      anyUser.freeRequestsUsed === undefined &&
      anyUser.freeReqestsUsed !== undefined
    ) {
      anyUser.freeRequestsUsed = anyUser.freeReqestsUsed;
    }

    if (anyUser.freeRequestsUsed === undefined) {
      anyUser.freeRequestsUsed = 0;
    }

    if (anyUser.freeReqestsUsed !== undefined) {
      anyUser.freeReqestsUsed = undefined;
    }

    await user.save();
    updated++;
  }

  console.log(`Migration complete. Updated ${updated} users.`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});

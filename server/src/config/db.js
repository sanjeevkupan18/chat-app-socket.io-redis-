import mongoose from "mongoose";
import config from "./config.js";

const connectDB = async () => {
  const candidates = [config.MONGO_URI, process.env.MONGO_URI_LOCAL].filter(
    Boolean,
  );

  let lastError = null;

  for (const uri of candidates) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
      });

      console.log("MongoDB connected");
      return true;
    } catch (error) {
      lastError = error;
      console.warn("MongoDB connection attempt failed:", error.message);
    }
  }

  if (process.env.NODE_ENV === "production") {
    console.error(lastError?.message || "MongoDB connection failed");
    process.exit(1);
  }

  console.warn(
    "MongoDB is not available. Starting server without a database connection.",
  );

  return false;
};

export default connectDB;

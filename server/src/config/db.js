import mongoose from "mongoose";
import config from "./config.js";

// Setup connection lifecycle listeners
mongoose.connection.on("connected", () => {
  console.log("MongoDB connected successfully");
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err.message);
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected. Attempting automatic reconnection...");
});

const connectWithRetry = async (uri, maxRetries = 5, delayMs = 2000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`MongoDB connection attempt ${attempt}/${maxRetries}...`);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000,
        socketTimeoutMS: 45000,
      });
      return true;
    } catch (error) {
      console.warn(
        `MongoDB attempt ${attempt} failed: ${error.message}`,
      );
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  return false;
};

const connectDB = async () => {
  // If already connected, return immediately
  if (mongoose.connection.readyState === 1) {
    return true;
  }

  const candidates = [config.MONGO_URI, process.env.MONGO_URI_LOCAL].filter(
    Boolean,
  );

  for (const uri of candidates) {
    const success = await connectWithRetry(uri, 4, 1500);
    if (success) {
      return true;
    }
  }

  console.error(
    "CRITICAL: Could not connect to any MongoDB instance after retries.",
  );

  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }

  return false;
};

export default connectDB;

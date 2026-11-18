import mongoose from "mongoose";

const callSchema = new mongoose.Schema(
  {
    caller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    callType: {
      type: String,
      enum: ["audio", "video"],
      default: "audio",
    },
    status: {
      type: String,
      enum: [
        "initiated",
        "ringing",
        "accepted",
        "connected",
        "completed",
        "rejected",
        "missed",
        "busy",
        "failed",
      ],
      default: "initiated",
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    answeredAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number,
      default: 0, // in seconds
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying a user's calls quickly
callSchema.index({ caller: 1, createdAt: -1 });
callSchema.index({ receiver: 1, createdAt: -1 });

const Call = mongoose.model("Call", callSchema);

export default Call;

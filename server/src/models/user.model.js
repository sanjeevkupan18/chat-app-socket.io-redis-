import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    avatar: {
      type: String,
      default: "",
    },

    isOnline: {
      type: Boolean,
      default: false,
    },

    lastSeen: {
      type: Date,
      default: null,
    },

    hideLastSeen: {
      type: Boolean,
      default: false,
    },

    statusEmoji: {
      type: String,
      default: "",
      maxlength: 10,
    },

    statusText: {
      type: String,
      default: "",
      maxlength: 100,
    },

    about: {
      type: String,
      default: "Hey there! I am using Chat App.",
      maxlength: 150,
    },

    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    mutedConversations: [
      {
        conversationId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Conversation",
        },
        mutedUntil: {
          type: Date,
          default: null,
        },
      },
    ],

    sessions: [
      {
        sessionId: {
          type: String,
          required: true,
        },
        device: {
          type: String,
          default: "Desktop",
        },
        browser: {
          type: String,
          default: "Browser",
        },
        os: {
          type: String,
          default: "Unknown OS",
        },
        ip: {
          type: String,
          default: "127.0.0.1",
        },
        lastActive: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", userSchema);

export default User;

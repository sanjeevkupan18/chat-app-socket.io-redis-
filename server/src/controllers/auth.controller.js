import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import config from "../config/config.js";
import User from "../models/user.model.js";
import { parseUserAgent, getClientIp } from "../utils/deviceParser.js";

const generateToken = (userId, sessionId) => {
  return jwt.sign(
    {
      userId,
      sessionId,
    },
    config.JWT_SECRET,
    {
      expiresIn: "7d",
    },
  );
};

const sanitizeUser = (user) => {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    isOnline: user.isOnline,
    lastSeen: user.lastSeen,
    hideLastSeen: Boolean(user.hideLastSeen),
    statusEmoji: user.statusEmoji || "",
    statusText: user.statusText || "",
    about: user.about || "Hey there! I am using Chat App.",
    blockedUsers: (user.blockedUsers || []).map((id) => (id._id || id).toString()),
    mutedConversations: user.mutedConversations || [],
  };
};

export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const sessionId = crypto.randomUUID();
    const { browser, os, device } = parseUserAgent(req.headers["user-agent"]);
    const ip = getClientIp(req);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      sessions: [
        {
          sessionId,
          device,
          browser,
          os,
          ip,
          lastActive: new Date(),
        },
      ],
    });

    const token = generateToken(user._id, sessionId);

    res.status(201).json({
      message: "Registration successful",

      token,

      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Register error:", error);

    res.status(500).json({
      message: "Registration failed",
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    user.isOnline = true;
    user.lastSeen = null;

    const sessionId = crypto.randomUUID();
    const { browser, os, device } = parseUserAgent(req.headers["user-agent"]);
    const ip = getClientIp(req);

    if (!user.sessions) user.sessions = [];
    user.sessions.unshift({
      sessionId,
      device,
      browser,
      os,
      ip,
      lastActive: new Date(),
    });
    if (user.sessions.length > 10) user.sessions = user.sessions.slice(0, 10);

    await user.save();

    const token = generateToken(user._id, sessionId);

    res.json({
      message: "Login successful",

      token,

      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Login failed",
    });
  }
};

export const logoutUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    req.user.isOnline = false;
    req.user.lastSeen = new Date();

    await req.user.save();

    res.json({
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);

    res.status(500).json({
      message: "Logout failed",
    });
  }
};

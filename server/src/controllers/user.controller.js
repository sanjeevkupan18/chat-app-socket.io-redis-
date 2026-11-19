import User from "../models/user.model.js";
import { parseUserAgent, getClientIp } from "../utils/deviceParser.js";

const sanitizeUser = (user) => {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    isOnline: user.isOnline,
    lastSeen: user.hideLastSeen ? null : user.lastSeen,
    hideLastSeen: Boolean(user.hideLastSeen),
    statusEmoji: user.statusEmoji || "",
    statusText: user.statusText || "",
    about: user.about || "Hey there! I am using Chat App.",
    blockedUsers: (user.blockedUsers || []).map((id) => (id._id || id).toString()),
    mutedConversations: user.mutedConversations || [],
  };
};

export const searchUsers = async (req, res) => {
  try {
    const search = (req.query.search || req.query.query || "").trim();

    const queryFilter = {
      _id: {
        $ne: req.user._id,
      },
    };

    if (search) {
      queryFilter.$or = [
        {
          name: {
            $regex: search,
            $options: "i",
          },
        },
        {
          email: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const users = await User.find(queryFilter)
      .select("name email avatar isOnline lastSeen hideLastSeen statusEmoji statusText about")
      .limit(30);

    res.json(users);
  } catch (error) {
    console.error("Search users error:", error);

    res.status(500).json({
      message: "Unable to search users",
    });
  }
};

export const getMyProfile = async (req, res) => {
  try {
    res.json({
      user: sanitizeUser(req.user),
    });
  } catch (error) {
    res.status(500).json({
      message: "Unable to fetch profile",
    });
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    const { name, avatar, hideLastSeen, statusEmoji, statusText, about } = req.body;

    const updates = {};

    if (typeof name === "string") {
      const trimmedName = name.trim();

      if (trimmedName.length < 2 || trimmedName.length > 50) {
        return res.status(400).json({
          message: "Name must be between 2 and 50 characters",
        });
      }

      updates.name = trimmedName;
    }

    if (typeof avatar === "string") {
      updates.avatar = avatar.trim();
    }

    if (typeof hideLastSeen === "boolean") {
      updates.hideLastSeen = hideLastSeen;
    }

    if (typeof statusEmoji === "string") {
      updates.statusEmoji = statusEmoji.trim().slice(0, 10);
    }

    if (typeof statusText === "string") {
      updates.statusText = statusText.trim().slice(0, 100);
    }

    if (typeof about === "string") {
      updates.about = about.trim().slice(0, 150);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No profile changes were provided",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: updates,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const sanitized = sanitizeUser(updatedUser);

    // Broadcast user profile update to other connected users
    const io = req.app.get("io");
    if (io) {
      io.emit("userProfileUpdated", sanitized);
    }

    res.json({
      message: "Profile updated successfully",
      user: sanitized,
    });
  } catch (error) {
    console.error("Update profile error:", error);

    res.status(500).json({
      message: "Unable to update profile",
    });
  }
};

/*
 * ACTIVE SESSIONS
 */
export const getActiveSessions = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("sessions");
    const currentSessionId = req.sessionId;
    let userSessions = user.sessions || [];

    // If current session isn't in userSessions yet, create or register one
    if (currentSessionId && !userSessions.some((s) => s.sessionId === currentSessionId)) {
      const clientInfo = parseUserAgent(req.headers["user-agent"]);
      const ip = getClientIp(req);
      const newSession = {
        sessionId: currentSessionId,
        device: clientInfo.device,
        browser: clientInfo.browser,
        os: clientInfo.os,
        ip,
        lastActive: new Date(),
      };
      userSessions.unshift(newSession);
      user.sessions = userSessions;
      await user.save();
    } else if (userSessions.length === 0) {
      // Synthesize for display if legacy session
      const clientInfo = parseUserAgent(req.headers["user-agent"]);
      const ip = getClientIp(req);
      userSessions = [
        {
          sessionId: "current",
          device: clientInfo.device,
          browser: clientInfo.browser,
          os: clientInfo.os,
          ip,
          lastActive: new Date(),
        },
      ];
    }

    const sessions = userSessions.map((s) => ({
      sessionId: s.sessionId,
      device: s.device,
      browser: s.browser,
      os: s.os,
      ip: s.ip,
      lastActive: s.lastActive,
      isCurrent: s.sessionId === currentSessionId || s.sessionId === "current",
    }));

    res.json({ sessions });
  } catch (err) {
    console.error("Get active sessions error:", err);
    res.status(500).json({ message: "Failed to fetch active sessions" });
  }
};

export const logoutAllOtherSessions = async (req, res) => {
  try {
    const currentSessionId = req.sessionId;
    const user = await User.findById(req.user._id);

    if (currentSessionId) {
      user.sessions = (user.sessions || []).filter((s) => s.sessionId === currentSessionId);
    } else {
      user.sessions = [];
    }

    await user.save();
    res.json({ message: "Successfully logged out of all other devices" });
  } catch (err) {
    console.error("Logout other sessions error:", err);
    res.status(500).json({ message: "Failed to logout other sessions" });
  }
};

export const logoutSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const user = await User.findById(req.user._id);

    user.sessions = (user.sessions || []).filter((s) => s.sessionId !== sessionId);
    await user.save();

    res.json({ message: "Session terminated successfully" });
  } catch (err) {
    console.error("Logout session error:", err);
    res.status(500).json({ message: "Failed to logout session" });
  }
};

/*
 * BLOCK / UNBLOCK USERS
 */
export const blockUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot block yourself" });
    }

    const user = await User.findById(req.user._id);
    const targetIdStr = id.toString();

    if (!user.blockedUsers) user.blockedUsers = [];
    const exists = user.blockedUsers.some((uId) => uId.toString() === targetIdStr);

    if (!exists) {
      user.blockedUsers.push(id);
      await user.save();
    }

    res.json({
      message: "User blocked successfully",
      blockedUsers: user.blockedUsers.map((u) => u.toString()),
    });
  } catch (err) {
    console.error("Block user error:", err);
    res.status(500).json({ message: "Failed to block user" });
  }
};

export const unblockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user._id);

    user.blockedUsers = (user.blockedUsers || []).filter((uId) => uId.toString() !== id.toString());
    await user.save();

    res.json({
      message: "User unblocked successfully",
      blockedUsers: user.blockedUsers.map((u) => u.toString()),
    });
  } catch (err) {
    console.error("Unblock user error:", err);
    res.status(500).json({ message: "Failed to unblock user" });
  }
};

export const getBlockedUsers = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "blockedUsers",
      "name email avatar isOnline statusEmoji statusText",
    );
    res.json(user.blockedUsers || []);
  } catch (err) {
    console.error("Get blocked users error:", err);
    res.status(500).json({ message: "Failed to fetch blocked users" });
  }
};

/*
 * MUTE / UNMUTE CONVERSATIONS
 */
export const toggleMuteConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const { durationHours = null } = req.body;

    const user = await User.findById(req.user._id);
    if (!user.mutedConversations) user.mutedConversations = [];

    const existingIndex = user.mutedConversations.findIndex(
      (m) => m.conversationId?.toString() === id.toString(),
    );

    let isMuted = false;

    if (existingIndex > -1) {
      user.mutedConversations.splice(existingIndex, 1);
      isMuted = false;
    } else {
      let mutedUntil = null;
      if (typeof durationHours === "number" && durationHours > 0) {
        mutedUntil = new Date(Date.now() + durationHours * 3600 * 1000);
      }
      user.mutedConversations.push({
        conversationId: id,
        mutedUntil,
      });
      isMuted = true;
    }

    await user.save();

    res.json({
      isMuted,
      mutedConversations: user.mutedConversations,
    });
  } catch (err) {
    console.error("Toggle mute conversation error:", err);
    res.status(500).json({ message: "Failed to update mute state" });
  }
};

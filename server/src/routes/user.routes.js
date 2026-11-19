import express from "express";

import protect from "../middleware/authMiddleware.js";

import {
  searchUsers,
  getMyProfile,
  updateMyProfile,
  getActiveSessions,
  logoutAllOtherSessions,
  logoutSession,
  blockUser,
  unblockUser,
  getBlockedUsers,
  toggleMuteConversation,
} from "../controllers/user.controller.js";

const router = express.Router();

router.get("/search", protect, searchUsers);
router.get("/me", protect, getMyProfile);
router.put("/me", protect, updateMyProfile);

// Sessions & Security
router.get("/sessions", protect, getActiveSessions);
router.post("/sessions/logout-all", protect, logoutAllOtherSessions);
router.delete("/sessions/:sessionId", protect, logoutSession);

// Blocking
router.get("/blocked", protect, getBlockedUsers);
router.post("/:id/block", protect, blockUser);
router.delete("/:id/block", protect, unblockUser);

// Muting
router.put("/conversations/:id/mute", protect, toggleMuteConversation);

export default router;

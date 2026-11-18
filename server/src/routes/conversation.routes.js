import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  createConversation,
  getConversations,
  createGroupConversation,
  updateGroup,
  updateGroupMembers,
  updateGroupAdmins,
  togglePinConversation,
  markConversationAsRead,
} from "../controllers/conversation.controller.js";

const router = express.Router();

router.post("/", protect, createConversation);
router.get("/", protect, getConversations);
router.put("/:id/pin", protect, togglePinConversation);
router.put("/:id/read", protect, markConversationAsRead);

// Group Chat Routes
router.post("/group", protect, createGroupConversation);
router.put("/group/:id", protect, updateGroup);
router.put("/group/:id/members", protect, updateGroupMembers);
router.put("/group/:id/admins", protect, updateGroupAdmins);

export default router;

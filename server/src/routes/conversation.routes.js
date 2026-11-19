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
  pinMessage,
  unpinMessage,
  updateDisappearingMessages,
} from "../controllers/conversation.controller.js";

const router = express.Router();

router.post("/", protect, createConversation);
router.get("/", protect, getConversations);
router.put("/:id/pin", protect, togglePinConversation);
router.put("/:id/read", protect, markConversationAsRead);
router.put("/:id/pin-message", protect, pinMessage);
router.delete("/:id/pin-message/:messageId", protect, unpinMessage);
router.put("/:id/disappearing", protect, updateDisappearingMessages);

// Group Chat Routes
router.post("/group", protect, createGroupConversation);
router.put("/group/:id", protect, updateGroup);
router.put("/group/:id/members", protect, updateGroupMembers);
router.put("/group/:id/admins", protect, updateGroupAdmins);

export default router;

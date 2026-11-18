import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  getMessages,
  toggleStarMessage,
  getStarredMessages,
  getConversationMedia,
} from "../controllers/message.controller.js";

const router = express.Router();

router.get("/starred", protect, getStarredMessages);
router.put("/:id/star", protect, toggleStarMessage);
router.get("/:conversationId/media", protect, getConversationMedia);
router.get("/:conversationId", protect, getMessages);

export default router;

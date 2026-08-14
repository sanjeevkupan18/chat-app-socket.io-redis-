import express from "express";

import protect from "../middleware/authMiddleware.js";

import { getMessages } from "../controllers/message.controller.js";

const router = express.Router();

router.get("/:conversationId", protect, getMessages);

export default router;

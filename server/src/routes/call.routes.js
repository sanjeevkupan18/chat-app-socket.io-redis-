import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  getCallHistory,
  getActiveCall,
  getCallById,
  getIceCredentials,
} from "../controllers/call.controller.js";

const router = express.Router();

router.get("/history", protect, getCallHistory);
router.get("/active", protect, getActiveCall);
router.get("/:id", protect, getCallById);
router.post("/ice-credentials", protect, getIceCredentials);

export default router;

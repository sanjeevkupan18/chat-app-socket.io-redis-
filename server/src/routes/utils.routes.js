import express from "express";
import { getLinkPreview } from "../controllers/utils.controller.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/link-preview", protect, getLinkPreview);

export default router;

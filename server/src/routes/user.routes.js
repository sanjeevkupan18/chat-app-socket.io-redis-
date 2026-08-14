import express from "express";

import protect from "../middleware/authMiddleware.js";

import {
  searchUsers,
  getMyProfile,
  updateMyProfile,
} from "../controllers/user.controller.js";

const router = express.Router();

router.get("/search", protect, searchUsers);

router.get("/me", protect, getMyProfile);

router.put("/me", protect, updateMyProfile);

export default router;

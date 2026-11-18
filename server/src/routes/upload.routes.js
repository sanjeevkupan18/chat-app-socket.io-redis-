import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import protect from "../middleware/authMiddleware.js";
import { isCloudinaryConfigured, uploadToCloudinary } from "../config/cloudinary.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, "../../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Store in memory buffer so we can stream to Cloudinary or write to disk
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB
  },
});

const router = express.Router();

router.post("/", protect, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const mime = req.file.mimetype || "";
    let messageType = "file";
    let cloudinaryResourceType = "raw";

    if (mime.startsWith("image/")) {
      messageType = "image";
      cloudinaryResourceType = "image";
    } else if (mime.startsWith("video/")) {
      messageType = "video";
      cloudinaryResourceType = "video";
    } else if (mime.startsWith("audio/")) {
      messageType = "audio";
      // Cloudinary handles audio files under the video resource_type
      cloudinaryResourceType = "video";
    }

    let fileUrl = "";

    // 1. If Cloudinary is configured, upload to Cloudinary CDN
    if (isCloudinaryConfigured()) {
      try {
        const cleanName = path.parse(req.file.originalname).name.replace(/[^a-zA-Z0-9_-]/g, "_");
        const uniqueId = `${cleanName}-${Date.now()}`;

        const uploadResult = await uploadToCloudinary(req.file.buffer, {
          resource_type: cloudinaryResourceType,
          public_id: uniqueId,
        });

        fileUrl = uploadResult.secure_url;
      } catch (cloudErr) {
        console.error("Cloudinary upload failed, falling back to local storage:", cloudErr.message);
      }
    }

    // 2. If Cloudinary is not configured or failed, save locally
    if (!fileUrl) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      const filePath = path.join(uploadDir, filename);

      await fs.promises.writeFile(filePath, req.file.buffer);
      fileUrl = `/uploads/${filename}`;
    }

    res.json({
      url: fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: mime,
      messageType,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "File upload failed" });
  }
});

export default router;

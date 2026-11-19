import jwt from "jsonwebtoken";
import config from "../config/config.js";
import User from "../models/user.model.js";

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, config.JWT_SECRET);

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        message: "User no longer exists",
      });
    }

    if (
      decoded.sessionId &&
      user.sessions &&
      user.sessions.length > 0 &&
      !user.sessions.some((s) => s.sessionId === decoded.sessionId)
    ) {
      return res.status(401).json({
        message: "This session has been logged out",
      });
    }

    req.user = user;
    req.sessionId = decoded.sessionId || null;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

export { protect };
export default protect;

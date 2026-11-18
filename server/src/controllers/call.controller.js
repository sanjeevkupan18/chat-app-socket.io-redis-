import Call from "../models/call.model.js";

/**
 * GET /api/calls/history
 * Fetch paginated call history for the authenticated user
 */
export const getCallHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const query = {
      $or: [{ caller: userId }, { receiver: userId }],
    };

    const [calls, total] = await Promise.all([
      Call.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("caller", "name email avatar")
        .populate("receiver", "name email avatar")
        .lean(),
      Call.countDocuments(query),
    ]);

    res.json({
      calls,
      page,
      pages: Math.ceil(total / limit) || 1,
      total,
    });
  } catch (error) {
    console.error("Get call history error:", error);
    res.status(500).json({ message: "Unable to retrieve call history" });
  }
};

/**
 * GET /api/calls/active
 * Get currently active call for the authenticated user (if any)
 */
export const getActiveCall = async (req, res) => {
  try {
    const userId = req.user._id;

    const activeCall = await Call.findOne({
      $or: [{ caller: userId }, { receiver: userId }],
      status: { $in: ["initiated", "ringing", "accepted", "connected"] },
    })
      .populate("caller", "name email avatar")
      .populate("receiver", "name email avatar")
      .lean();

    res.json({ activeCall: activeCall || null });
  } catch (error) {
    console.error("Get active call error:", error);
    res.status(500).json({ message: "Unable to check active call status" });
  }
};

/**
 * GET /api/calls/:id
 * Retrieve details for a specific call (restricted to participants)
 */
export const getCallById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const call = await Call.findById(id)
      .populate("caller", "name email avatar")
      .populate("receiver", "name email avatar")
      .lean();

    if (!call) {
      return res.status(404).json({ message: "Call record not found" });
    }

    const isParticipant =
      call.caller?._id?.toString() === userId.toString() ||
      call.receiver?._id?.toString() === userId.toString();

    if (!isParticipant) {
      return res.status(403).json({ message: "Access denied to this call record" });
    }

    res.json(call);
  } catch (error) {
    console.error("Get call by ID error:", error);
    res.status(500).json({ message: "Unable to retrieve call details" });
  }
};

/**
 * POST /api/calls/ice-credentials
 * Provide STUN and temporary TURN server configurations
 */
export const getIceCredentials = async (req, res) => {
  try {
    // Default reliable public STUN servers
    const iceServers = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
    ];

    // Optional Cloudflare Realtime TURN integration if env credentials exist
    const turnKeyId = process.env.CLOUDFLARE_TURN_KEY_ID;
    const turnApiToken = process.env.CLOUDFLARE_TURN_API_TOKEN;

    if (turnKeyId && turnApiToken) {
      try {
        const response = await fetch(
          `https://rtc.live.cloudflare.com/v1/turn/keys/${turnKeyId}/credentials/generate`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${turnApiToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ ttl: 86400 }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data?.iceServers) {
            return res.json({ iceServers: data.iceServers });
          }
        }
      } catch (cfErr) {
        console.warn("Cloudflare TURN credential fetch fallback:", cfErr.message);
      }
    }

    // Optional static TURN server credentials from environment
    if (process.env.TURN_SERVER_URL && process.env.TURN_USERNAME) {
      iceServers.push({
        urls: process.env.TURN_SERVER_URL,
        username: process.env.TURN_USERNAME,
        credential: process.env.TURN_PASSWORD || process.env.TURN_CREDENTIAL || "",
      });
    }

    res.json({ iceServers });
  } catch (error) {
    console.error("Get ICE credentials error:", error);
    // Always fallback to standard STUN
    res.json({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });
  }
};

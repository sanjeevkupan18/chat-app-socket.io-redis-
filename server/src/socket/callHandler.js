import Call from "../models/call.model.js";
import User from "../models/user.model.js";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import { getUserSockets } from "../services/socketPresence.service.js";

// Active timeouts map: callId -> NodeJS.Timeout
const callRingTimeouts = new Map();

/**
 * Log call completion/missed event to conversation chat history
 */
const logCallToChat = async (io, callDoc) => {
  try {
    if (!callDoc) return;
    const callerId = callDoc.caller?.toString();
    const receiverId = callDoc.receiver?.toString();
    if (!callerId || !receiverId) return;

    // Find or create 1-on-1 conversation
    const sortedIds = [callerId, receiverId].sort();
    const participantKey = sortedIds.join(":");

    let conversation = await Conversation.findOne({
      isGroup: false,
      participantKey,
    });

    if (!conversation) {
      conversation = await Conversation.findOne({
        isGroup: false,
        participants: { $all: [callerId, receiverId], $size: 2 },
      });
    }

    if (!conversation) {
      conversation = await Conversation.create({
        isGroup: false,
        participants: [callerId, receiverId],
        participantKey,
      });
    }

    const isVideo = callDoc.callType === "video";
    const typeLabel = isVideo ? "Video call" : "Voice call";

    let messageText = "";
    if (callDoc.status === "completed") {
      const duration = callDoc.duration || 0;
      const mins = Math.floor(duration / 60);
      const secs = duration % 60;
      const durationStr = `${mins > 0 ? `${mins}m ` : ""}${secs}s`;
      messageText = `${typeLabel} (${durationStr})`;
    } else if (callDoc.status === "missed") {
      messageText = `Missed ${isVideo ? "video" : "voice"} call`;
    } else if (callDoc.status === "rejected") {
      messageText = `Declined ${isVideo ? "video" : "voice"} call`;
    } else if (callDoc.status === "busy") {
      messageText = `Busy ${isVideo ? "video" : "voice"} call`;
    } else {
      messageText = `${typeLabel}`;
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender: callerId,
      receiver: receiverId,
      text: messageText,
      messageType: "call",
      callInfo: {
        callId: callDoc._id,
        callType: callDoc.callType || "audio",
        status: callDoc.status || "completed",
        duration: callDoc.duration || 0,
      },
      status: "delivered",
      deliveredAt: new Date(),
      isRead: false,
      readBy: [callerId],
    });

    await message.populate([
      { path: "sender", select: "name email avatar" },
      { path: "receiver", select: "name email avatar" },
    ]);

    conversation.lastMessage = message._id;
    await conversation.save();

    // Route new message to active sockets of both users
    const callerSockets = await getUserSockets(callerId);
    const receiverSockets = await getUserSockets(receiverId);

    [...callerSockets, ...receiverSockets].forEach((socketId) => {
      io.to(socketId).emit("newMessage", message);
    });

    // Update conversation sidebar for both users
    [callerId, receiverId].forEach((pId) => {
      io.to(`user:${pId}`).emit("conversationUpdated", {
        conversationId: conversation._id.toString(),
        message,
        updatedAt: conversation.updatedAt,
      });
    });
  } catch (err) {
    console.error("Error logging call to chat:", err);
  }
};

export const setupCallHandlers = (io, socket) => {
  const currentUserId = socket.user._id.toString();

  /**
   * 1. INITIATE CALL
   * Client -> Server: { receiverId, callType }
   */
  socket.on("call:initiate", async ({ receiverId, callType = "audio" }) => {
    try {
      if (!receiverId || receiverId === currentUserId) {
        return socket.emit("call:error", { message: "Invalid call recipient" });
      }

      const receiver = await User.findById(receiverId).select("name email avatar isOnline");
      if (!receiver) {
        return socket.emit("call:error", { message: "User not found" });
      }

      // Check online status via socket presence
      const receiverSockets = await getUserSockets(receiverId);
      if (!receiverSockets || receiverSockets.length === 0) {
        // Save missed call record
        const offlineMissedCall = await Call.create({
          caller: currentUserId,
          receiver: receiverId,
          callType,
          status: "missed",
          startedAt: new Date(),
          endedAt: new Date(),
          duration: 0,
        });

        await logCallToChat(io, offlineMissedCall);

        return socket.emit("call:offline", {
          receiverId,
          message: `${receiver.name} is currently offline`,
        });
      }

      // Check if either party is currently in an active ongoing call
      const activeCall = await Call.findOne({
        $or: [
          { caller: currentUserId, status: { $in: ["ringing", "accepted", "connected"] } },
          { receiver: currentUserId, status: { $in: ["ringing", "accepted", "connected"] } },
          { caller: receiverId, status: { $in: ["ringing", "accepted", "connected"] } },
          { receiver: receiverId, status: { $in: ["ringing", "accepted", "connected"] } },
        ],
      });

      if (activeCall) {
        const isSelfInCall =
          activeCall.caller.toString() === currentUserId ||
          activeCall.receiver.toString() === currentUserId;

        if (isSelfInCall) {
          return socket.emit("call:error", { message: "You are already in an active call" });
        }

        return socket.emit("call:busy", {
          receiverId,
          message: `${receiver.name} is currently on another call`,
        });
      }

      // Create new Call record in DB
      const newCall = await Call.create({
        caller: currentUserId,
        receiver: receiverId,
        callType,
        status: "ringing",
        startedAt: new Date(),
      });

      const callIdStr = newCall._id.toString();

      // Ringing timeout (40 seconds max)
      const timer = setTimeout(async () => {
        try {
          const timedOutCall = await Call.findById(callIdStr);
          if (timedOutCall && timedOutCall.status === "ringing") {
            timedOutCall.status = "missed";
            timedOutCall.endedAt = new Date();
            await timedOutCall.save();

            await logCallToChat(io, timedOutCall);

            io.to(`user:${currentUserId}`).emit("call:missed", { callId: callIdStr });
            io.to(`user:${receiverId}`).emit("call:missed", { callId: callIdStr });
          }
        } catch (err) {
          console.error("Call timeout error:", err);
        } finally {
          callRingTimeouts.delete(callIdStr);
        }
      }, 40000);

      callRingTimeouts.set(callIdStr, timer);

      // Notify caller that call is ringing
      socket.emit("call:ringing", {
        callId: callIdStr,
        receiverId,
        receiver: {
          _id: receiver._id,
          name: receiver.name,
          avatar: receiver.avatar,
        },
        callType,
      });

      // Send incoming call prompt to receiver's user room
      io.to(`user:${receiverId}`).emit("call:incoming", {
        callId: callIdStr,
        caller: {
          _id: socket.user._id,
          name: socket.user.name,
          avatar: socket.user.avatar,
        },
        callType,
      });
    } catch (error) {
      console.error("call:initiate error:", error);
      socket.emit("call:error", { message: "Failed to initiate call" });
    }
  });

  /**
   * 2. ACCEPT CALL
   * Client -> Server: { callId }
   */
  socket.on("call:accept", async ({ callId }) => {
    try {
      if (!callId) return;

      const call = await Call.findById(callId);
      if (!call) {
        return socket.emit("call:error", { message: "Call record not found" });
      }

      if (call.receiver.toString() !== currentUserId) {
        return socket.emit("call:error", { message: "Unauthorized to accept this call" });
      }

      if (call.status !== "ringing") {
        return socket.emit("call:error", { message: "Call is no longer active" });
      }

      // Clear ringing timeout
      if (callRingTimeouts.has(callId)) {
        clearTimeout(callRingTimeouts.get(callId));
        callRingTimeouts.delete(callId);
      }

      call.status = "accepted";
      call.answeredAt = new Date();
      await call.save();

      // Notify caller that receiver accepted
      io.to(`user:${call.caller.toString()}`).emit("call:accepted", {
        callId: call._id.toString(),
        receiver: {
          _id: socket.user._id,
          name: socket.user.name,
          avatar: socket.user.avatar,
        },
      });

      // Confirm to receiver
      socket.emit("call:accepted", {
        callId: call._id.toString(),
      });
    } catch (error) {
      console.error("call:accept error:", error);
      socket.emit("call:error", { message: "Failed to accept call" });
    }
  });

  /**
   * 3. REJECT CALL
   * Client -> Server: { callId }
   */
  socket.on("call:reject", async ({ callId }) => {
    try {
      if (!callId) return;

      const call = await Call.findById(callId);
      if (!call) return;

      const callerId = call.caller.toString();
      const receiverId = call.receiver.toString();

      if (currentUserId !== callerId && currentUserId !== receiverId) {
        return;
      }

      if (callRingTimeouts.has(callId)) {
        clearTimeout(callRingTimeouts.get(callId));
        callRingTimeouts.delete(callId);
      }

      call.status = "rejected";
      call.endedAt = new Date();
      await call.save();

      await logCallToChat(io, call);

      const otherUserId = currentUserId === callerId ? receiverId : callerId;
      io.to(`user:${otherUserId}`).emit("call:rejected", { callId });
      socket.emit("call:rejected", { callId });
    } catch (error) {
      console.error("call:reject error:", error);
    }
  });

  /**
   * 4. WEBRTC OFFER
   * Client -> Server -> Peer: { callId, offer, to }
   */
  socket.on("call:offer", async ({ callId, offer, to }) => {
    try {
      if (!offer) return;

      let targetUserId = to;
      if (!targetUserId && callId) {
        const call = await Call.findById(callId);
        if (call) {
          targetUserId =
            call.caller.toString() === currentUserId
              ? call.receiver.toString()
              : call.caller.toString();
        }
      }

      if (!targetUserId) {
        console.warn("call:offer dropped: destination user unknown");
        return;
      }

      io.to(`user:${targetUserId}`).emit("call:offer", {
        callId,
        offer,
        from: currentUserId,
      });
    } catch (error) {
      console.error("call:offer error:", error);
    }
  });

  /**
   * 5. WEBRTC ANSWER
   * Client -> Server -> Peer: { callId, answer, to }
   */
  socket.on("call:answer", async ({ callId, answer, to }) => {
    try {
      if (!answer) return;

      let targetUserId = to;
      if (!targetUserId && callId) {
        const call = await Call.findById(callId);
        if (call) {
          targetUserId =
            call.caller.toString() === currentUserId
              ? call.receiver.toString()
              : call.caller.toString();
        }
      }

      if (callId) {
        await Call.findByIdAndUpdate(callId, { status: "connected" });
      }

      if (!targetUserId) {
        console.warn("call:answer dropped: destination user unknown");
        return;
      }

      io.to(`user:${targetUserId}`).emit("call:answer", {
        callId,
        answer,
        from: currentUserId,
      });
    } catch (error) {
      console.error("call:answer error:", error);
    }
  });

  /**
   * 6. EXCHANGE ICE CANDIDATE
   * Client -> Server -> Peer: { callId, candidate, to }
   */
  socket.on("call:ice-candidate", async ({ callId, candidate, to }) => {
    try {
      if (!candidate) return;

      let targetUserId = to;
      if (!targetUserId && callId) {
        const call = await Call.findById(callId);
        if (call) {
          targetUserId =
            call.caller.toString() === currentUserId
              ? call.receiver.toString()
              : call.caller.toString();
        }
      }

      if (!targetUserId) return;

      io.to(`user:${targetUserId}`).emit("call:ice-candidate", {
        callId,
        candidate,
        from: currentUserId,
      });
    } catch (error) {
      console.error("call:ice-candidate error:", error);
    }
  });

  /**
   * 7. END CALL
   * Client -> Server -> Both: { callId }
   */
  socket.on("call:end", async ({ callId }) => {
    try {
      if (!callId) return;

      if (callRingTimeouts.has(callId)) {
        clearTimeout(callRingTimeouts.get(callId));
        callRingTimeouts.delete(callId);
      }

      const call = await Call.findById(callId);
      if (!call) return;

      const callerId = call.caller.toString();
      const receiverId = call.receiver.toString();

      let duration = 0;
      if (call.answeredAt) {
        duration = Math.max(0, Math.floor((Date.now() - call.answeredAt.getTime()) / 1000));
      }

      if (call.status !== "completed") {
        call.status = call.answeredAt ? "completed" : "missed";
        call.endedAt = new Date();
        call.duration = duration;
        await call.save();
      }

      await logCallToChat(io, call);

      // Notify both caller and receiver
      io.to(`user:${callerId}`).emit("call:ended", { callId, duration });
      io.to(`user:${receiverId}`).emit("call:ended", { callId, duration });
    } catch (error) {
      console.error("call:end error:", error);
    }
  });
};

/**
 * Handle disconnect cleanup for ongoing active calls
 */
export const handleCallDisconnect = async (io, socket) => {
  try {
    const userId = socket.user?._id?.toString();
    if (!userId) return;

    // Find active call for this user
    const activeCall = await Call.findOne({
      $or: [{ caller: userId }, { receiver: userId }],
      status: { $in: ["initiated", "ringing", "accepted", "connected"] },
    });

    if (activeCall) {
      const callId = activeCall._id.toString();
      if (callRingTimeouts.has(callId)) {
        clearTimeout(callRingTimeouts.get(callId));
        callRingTimeouts.delete(callId);
      }

      let duration = 0;
      if (activeCall.answeredAt) {
        duration = Math.max(0, Math.floor((Date.now() - activeCall.answeredAt.getTime()) / 1000));
      }

      activeCall.status = activeCall.answeredAt ? "completed" : "missed";
      activeCall.endedAt = new Date();
      activeCall.duration = duration;
      await activeCall.save();

      await logCallToChat(io, activeCall);

      const otherUserId =
        activeCall.caller.toString() === userId
          ? activeCall.receiver.toString()
          : activeCall.caller.toString();

      io.to(`user:${otherUserId}`).emit("call:ended", {
        callId,
        duration,
        reason: "Peer disconnected",
      });
    }
  } catch (err) {
    console.error("handleCallDisconnect error:", err);
  }
};

import jwt from "jsonwebtoken";
import config from "../config/config.js";
import User from "../models/user.model.js";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import {
  addUserSocket,
  removeUserSocket,
  getUserSockets,
  getOnlineUsers,
} from "../services/socketPresence.service.js";
import { setupCallHandlers, handleCallDisconnect } from "./callHandler.js";

const POPULATE_MESSAGE_FIELDS = [
  { path: "sender", select: "name email avatar" },
  { path: "receiver", select: "name email avatar" },
  { path: "reactions.user", select: "name avatar" },
  { path: "mentions", select: "name email avatar" },
  {
    path: "replyTo",
    select: "text messageType mediaUrl fileName sender isDeleted",
    populate: { path: "sender", select: "name" },
  },
];

export const setupSocket = (io) => {
  /*
   * SOCKET AUTHENTICATION
   */
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(token, config.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      if (!user) {
        return next(new Error("User not found"));
      }

      socket.user = user;
      next();
    } catch (error) {
      console.error("Socket authentication error:", error.message);
      next(new Error("Invalid socket authentication"));
    }
  });

  /*
   * CONNECTION
   */
  io.on("connection", async (socket) => {
    const userId = socket.user._id.toString();
    console.log(`Socket connected: ${userId} (${socket.id})`);

    // Personal room for notifications & receipts
    socket.join(`user:${userId}`);
    socket.join(userId);

    // Register WebRTC calling signaling handlers
    setupCallHandlers(io, socket);

    const emitConversationUpdate = (participantIds, conversationId, message, updatedAt) => {
      participantIds.forEach((participantId) => {
        io.to(`user:${participantId}`).emit("conversationUpdated", {
          conversationId,
          message,
          updatedAt,
        });
      });
    };

    // User -> Socket mapping & Online Status
    try {
      const result = await addUserSocket(userId, socket.id);

      await User.findByIdAndUpdate(userId, {
        isOnline: true,
        lastSeen: null,
      });

      if (result.existingSocketCount === 0) {
        socket.broadcast.emit("userOnline", { userId });
      }

      // MARK PENDING SENT MESSAGES AS DELIVERED
      const undeliveredMessages = await Message.find({
        receiver: userId,
        status: "sent",
        isDeleted: false,
      }).select("_id conversation sender");

      if (undeliveredMessages.length > 0) {
        const deliveredAt = new Date();
        const undeliveredIds = undeliveredMessages.map((m) => m._id);

        await Message.updateMany(
          { _id: { $in: undeliveredIds } },
          { $set: { status: "delivered", deliveredAt } },
        );

        // Group by sender and notify them
        const senderGroups = {};
        undeliveredMessages.forEach((msg) => {
          const sId = msg.sender.toString();
          if (!senderGroups[sId]) {
            senderGroups[sId] = {
              conversationId: msg.conversation.toString(),
              messageIds: [],
            };
          }
          senderGroups[sId].messageIds.push(msg._id.toString());
        });

        Object.entries(senderGroups).forEach(([sId, info]) => {
          io.to(`user:${sId}`).emit("messagesDelivered", {
            conversationId: info.conversationId,
            messageIds: info.messageIds,
            deliveredAt,
          });
        });
      }
    } catch (error) {
      console.error("User socket mapping / delivery error:", error);
    }

    /*
     * GET ONLINE USERS
     */
    socket.on("getOnlineUsers", async () => {
      try {
        const onlineUserIds = await getOnlineUsers();
        socket.emit("onlineUsers", onlineUserIds);
      } catch (error) {
        console.error("Get online users error:", error);
        socket.emit("onlineUsers", []);
      }
    });

    /*
     * JOIN CONVERSATION
     */
    socket.on("joinConversation", async (conversationId) => {
      try {
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
        });

        if (!conversation) {
          return socket.emit("socketError", { message: "Conversation not found" });
        }

        socket.join(`conversation:${conversationId}`);
      } catch (error) {
        console.error("Join conversation error:", error);
        socket.emit("socketError", { message: "Unable to join conversation" });
      }
    });

    /*
     * SEND MESSAGE (Supports 1-on-1, Group, Text, Media, Quotes)
     */
    socket.on("sendMessage", async (data) => {
      try {
        const {
          conversationId,
          receiverId,
          text = "",
          messageType = "text",
          mediaUrl = "",
          fileName = "",
          fileSize = 0,
          audioDuration = 0,
          replyTo = null,
          mentions = [],
        } = data;

        const trimmedText = (text || "").trim();
        const hasMedia = Boolean(mediaUrl && mediaUrl.trim());

        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
        });

        if (!conversation) {
          return socket.emit("socketError", { message: "Conversation not found" });
        }

        const isGroup = Boolean(conversation.isGroup);

        if (!conversationId || (!isGroup && !receiverId) || (!trimmedText && !hasMedia)) {
          return socket.emit("socketError", { message: "Invalid message data" });
        }

        if (!isGroup) {
          const receiverExists = conversation.participants.some(
            (p) => p.toString() === receiverId,
          );
          if (!receiverExists) {
            return socket.emit("socketError", {
              message: "Receiver is not part of this conversation",
            });
          }
        }

        let isDelivered = false;
        let receiverSockets = [];

        if (!isGroup && receiverId) {
          receiverSockets = await getUserSockets(receiverId);
          isDelivered = receiverSockets.length > 0;
        }

        const now = new Date();
        const allowedTypes = ["text", "image", "video", "audio", "file", "system"];
        const normalizedType = allowedTypes.includes(messageType) ? messageType : "text";

        let validReplyTo = null;
        if (replyTo) {
          const replyMsg = await Message.findOne({
            _id: replyTo,
            conversation: conversationId,
          });
          if (replyMsg) {
            validReplyTo = replyMsg._id;
          }
        }

        let validMentions = [];
        if (Array.isArray(mentions) && mentions.length > 0) {
          const participantIdStrs = new Set(
            conversation.participants.map((p) => p.toString()),
          );
          validMentions = mentions.filter((mId) =>
            participantIdStrs.has(mId?.toString()),
          );
        }

        const message = await Message.create({
          conversation: conversationId,
          sender: userId,
          receiver: isGroup ? null : receiverId,
          text: trimmedText,
          messageType: normalizedType,
          mediaUrl: mediaUrl || "",
          fileName: fileName || "",
          fileSize: fileSize || 0,
          audioDuration: audioDuration || 0,
          replyTo: validReplyTo,
          mentions: validMentions,
          status: isGroup ? "sent" : isDelivered ? "delivered" : "sent",
          deliveredAt: isDelivered ? now : null,
          isRead: false,
          readBy: [userId],
        });

        await message.populate(POPULATE_MESSAGE_FIELDS);

        conversation.lastMessage = message._id;
        await conversation.save();

        if (isGroup) {
          // Route to all group members' active sockets
          for (const memberId of conversation.participants) {
            const memberSockets = await getUserSockets(memberId.toString());
            memberSockets.forEach((sId) => {
              io.to(sId).emit("newMessage", message);
            });
          }
        } else {
          // 1-on-1: route to receiver and sender sockets
          receiverSockets.forEach((socketId) => {
            io.to(socketId).emit("newMessage", message);
          });

          const senderSockets = await getUserSockets(userId);
          senderSockets.forEach((socketId) => {
            io.to(socketId).emit("newMessage", message);
          });
        }

        // Update sidebars for all conversation members
        emitConversationUpdate(
          conversation.participants.map((p) => p.toString()),
          conversationId,
          message,
          conversation.updatedAt,
        );
      } catch (error) {
        console.error("Send message error:", error);
        socket.emit("socketError", { message: "Message could not be sent" });
      }
    });

    /*
     * EMOJI REACTIONS
     */
    socket.on("messageReaction", async ({ conversationId, messageId, emoji }) => {
      try {
        if (!conversationId || !messageId || !emoji) return;

        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
        });

        if (!conversation) return;

        const message = await Message.findOne({
          _id: messageId,
          conversation: conversationId,
        });

        if (!message || message.isDeleted) return;

        const existingReactionIndex = message.reactions.findIndex(
          (r) => r.user.toString() === userId,
        );

        if (existingReactionIndex > -1) {
          if (message.reactions[existingReactionIndex].emoji === emoji) {
            // Toggle off if same emoji clicked again
            message.reactions.splice(existingReactionIndex, 1);
          } else {
            // Update to new emoji
            message.reactions[existingReactionIndex].emoji = emoji;
          }
        } else {
          message.reactions.push({ user: userId, emoji });
        }

        await message.save();
        await message.populate("reactions.user", "name avatar");

        const reactionData = {
          messageId,
          conversationId,
          reactions: message.reactions,
        };

        // Broadcast to conversation room and participants
        io.to(`conversation:${conversationId}`).emit("messageReactionUpdated", reactionData);

        for (const pId of conversation.participants) {
          const pSockets = await getUserSockets(pId.toString());
          pSockets.forEach((sId) => {
            io.to(sId).emit("messageReactionUpdated", reactionData);
          });
        }
      } catch (error) {
        console.error("Message reaction error:", error);
      }
    });

    /*
     * TYPING
     */
    socket.on("typing", ({ conversationId, isTyping }) => {
      socket.to(`conversation:${conversationId}`).emit("userTyping", {
        userId,
        userName: socket.user?.name || "",
        conversationId,
        isTyping,
      });
    });

    /*
     * EDIT MESSAGE (within 15 minutes)
     */
    socket.on("editMessage", async ({ conversationId, messageId, text }) => {
      try {
        if (!conversationId || !messageId || !text?.trim()) {
          return socket.emit("socketError", { message: "Invalid message data" });
        }

        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
        });

        if (!conversation) {
          return socket.emit("socketError", { message: "Conversation not found" });
        }

        const message = await Message.findOne({
          _id: messageId,
          conversation: conversationId,
          sender: userId,
          isDeleted: false,
        });

        if (!message) {
          return socket.emit("socketError", { message: "Message not found" });
        }

        const fifteenMinutes = 15 * 60 * 1000;
        if (Date.now() - new Date(message.createdAt).getTime() > fifteenMinutes) {
          return socket.emit("socketError", {
            message: "Messages can only be edited within 15 minutes of sending.",
          });
        }

        message.text = text.trim();
        message.editedAt = new Date();
        await message.save();

        await message.populate(POPULATE_MESSAGE_FIELDS);

        io.to(`conversation:${conversationId}`).emit("messageUpdated", message);

        for (const pId of conversation.participants) {
          const pSockets = await getUserSockets(pId.toString());
          pSockets.forEach((sId) => {
            io.to(sId).emit("messageUpdated", message);
          });
        }

        if (conversation.lastMessage?.toString() === messageId) {
          emitConversationUpdate(
            conversation.participants.map((p) => p.toString()),
            conversationId,
            message,
            message.updatedAt,
          );
        }
      } catch (error) {
        console.error("Edit message error:", error);
        socket.emit("socketError", { message: "Message could not be edited" });
      }
    });

    /*
     * DELETE MESSAGE ("everyone" or "me")
     */
    socket.on("deleteMessage", async ({ conversationId, messageId, deleteType = "everyone" }) => {
      try {
        if (!conversationId || !messageId) {
          return socket.emit("socketError", { message: "Invalid message data" });
        }

        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
        });

        if (!conversation) {
          return socket.emit("socketError", { message: "Conversation not found" });
        }

        const message = await Message.findOne({
          _id: messageId,
          conversation: conversationId,
        });

        if (!message) {
          return socket.emit("socketError", { message: "Message not found" });
        }

        if (deleteType === "me") {
          await Message.findByIdAndUpdate(messageId, {
            $addToSet: { deletedFor: userId },
          });

          const userSockets = await getUserSockets(userId);
          userSockets.forEach((socketId) => {
            io.to(socketId).emit("messageDeleted", {
              messageId,
              conversationId,
              deleteType: "me",
            });
          });
          return;
        }

        if (message.sender.toString() !== userId) {
          return socket.emit("socketError", {
            message: "You can only delete your own messages for everyone",
          });
        }

        message.isDeleted = true;
        message.deletedAt = new Date();
        message.text = "This message was deleted";
        message.mediaUrl = "";
        await message.save();

        await message.populate(POPULATE_MESSAGE_FIELDS);

        const deletePayload = {
          messageId,
          conversationId,
          message,
          deleteType: "everyone",
        };

        io.to(`conversation:${conversationId}`).emit("messageDeleted", deletePayload);

        for (const pId of conversation.participants) {
          const pSockets = await getUserSockets(pId.toString());
          pSockets.forEach((sId) => {
            io.to(sId).emit("messageDeleted", deletePayload);
          });
        }

        if (conversation.lastMessage?.toString() === messageId) {
          const replacement = await Message.findOne({
            conversation: conversationId,
            isDeleted: false,
            _id: { $ne: messageId },
          })
            .sort({ createdAt: -1 })
            .populate(POPULATE_MESSAGE_FIELDS);

          conversation.lastMessage = replacement?._id || null;
          await conversation.save();

          emitConversationUpdate(
            conversation.participants.map((p) => p.toString()),
            conversationId,
            replacement || message,
            conversation.updatedAt,
          );
        }
      } catch (error) {
        console.error("Delete message error:", error);
        socket.emit("socketError", { message: "Message could not be deleted" });
      }
    });

    /*
     * MARK ENTIRE CONVERSATION AS READ
     */
    socket.on("markConversationRead", async ({ conversationId }) => {
      try {
        if (!conversationId) return;

        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
        });

        if (!conversation) return;

        const readAt = new Date();

        if (conversation.isGroup) {
          // Group: add user to readBy
          const unreadGroupMsgs = await Message.find({
            conversation: conversationId,
            sender: { $ne: userId },
            readBy: { $ne: userId },
          }).select("_id");

          const ids = unreadGroupMsgs.map((m) => m._id);
          if (ids.length > 0) {
            await Message.updateMany(
              { _id: { $in: ids } },
              { $addToSet: { readBy: userId } },
            );
          }

          socket.emit("messagesRead", {
            conversationId,
            messageIds: ids.map((id) => id.toString()),
            readAt,
          });
        } else {
          // 1-on-1: mark isRead = true, status = "read"
          const unreadMessages = await Message.find({
            conversation: conversationId,
            receiver: userId,
            status: { $ne: "read" },
          }).select("_id sender");

          if (unreadMessages.length > 0) {
            const messageIds = unreadMessages.map((m) => m._id.toString());

            await Message.updateMany(
              { _id: { $in: unreadMessages.map((m) => m._id) } },
              { $set: { isRead: true, status: "read", readAt } },
            );

            const senderIds = [
              ...new Set(unreadMessages.map((m) => m.sender.toString())),
            ];

            senderIds.forEach((senderId) => {
              io.to(`user:${senderId}`).emit("messagesRead", {
                conversationId,
                messageIds,
                readAt,
              });
            });
          }

          socket.emit("messagesRead", {
            conversationId,
            readAt,
          });
        }
      } catch (error) {
        console.error("Mark conversation read error:", error);
      }
    });

    /**
     * MARK INDIVIDUAL MESSAGE READ
     */
    socket.on("messageRead", async ({ messageId, conversationId }) => {
      try {
        if (!conversationId) return;
        const readAt = new Date();

        if (messageId) {
          const msg = await Message.findById(messageId);
          if (msg) {
            if (msg.receiver?.toString() === userId) {
              msg.status = "read";
              msg.isRead = true;
              msg.readAt = readAt;
            }
            if (!msg.readBy?.some((rId) => rId.toString() === userId)) {
              msg.readBy.push(userId);
            }
            await msg.save();

            if (msg.sender) {
              io.to(`user:${msg.sender.toString()}`).emit("messagesRead", {
                conversationId,
                messageIds: [messageId],
                readAt,
              });
            }
          }
        }

        socket.emit("messagesRead", {
          conversationId,
          readAt,
        });
      } catch (err) {
        console.error("messageRead error:", err);
      }
    });

    /*
     * DISCONNECT
     */
    socket.on("disconnect", async () => {
      try {
        console.log(`Socket disconnected: ${userId} (${socket.id})`);
        
        // Clean up any active ongoing calls for this user
        await handleCallDisconnect(io, socket);

        const remainingSockets = await removeUserSocket(userId, socket.id);

        if (remainingSockets === 0) {
          const userDoc = await User.findById(userId).select("hideLastSeen");
          const now = new Date();

          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen: now,
          });

          io.emit("userOffline", {
            userId,
            lastSeen: userDoc?.hideLastSeen ? null : now,
          });
        }
      } catch (error) {
        console.error("Disconnect presence error:", error);
      }
    });
  });
};

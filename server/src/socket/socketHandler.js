// import jwt from "jsonwebtoken";

// import config from "../config/config.js";
// import User from "../models/user.model.js";
// import Conversation from "../models/conversation.model.js";
// import Message from "../models/message.model.js";
// import redisClient from "../config/redis.js";

// export const setupSocket = (io) => {
//   /*
//    * SOCKET AUTHENTICATION
//    */

//   io.use(async (socket, next) => {
//     try {
//       const token = socket.handshake.auth?.token;

//       if (!token) {
//         return next(new Error("Authentication required"));
//       }

//       const decoded = jwt.verify(token, config.JWT_SECRET);

//       const user = await User.findById(decoded.userId);

//       if (!user) {
//         return next(new Error("User not found"));
//       }

//       socket.user = user;

//       next();
//     } catch (error) {
//       console.error("Socket authentication error:", error.message);

//       next(new Error("Invalid socket authentication"));
//     }
//   });

//   /*
//    * CONNECTION
//    */

//   io.on("connection", async (socket) => {
//     const userId = socket.user._id.toString();

//     console.log(`Socket connected: ${userId}`);

//     /*
//      * PERSONAL USER ROOM
//      */

//     socket.join(`user:${userId}`);

//     /*
//      * ONLINE STATUS - ADD SOCKET TO REDIS
//      */

//     await redisClient.sAdd(`user:${userId}:sockets`, socket.id);

//     /*
//      * OPTIONAL - UPDATE MONGODB USER STATUS
//      */
//     await User.findByIdAndUpdate(userId, {
//       // this code was previously used before redis implemenatation.
//       isOnline: true,
//       lastSeen: null,
//     });

//     /*
//      * INFORM OTHER USERS
//      */

//     socket.broadcast.emit("userOnline", {
//       userId,
//     });

//     /*
//      * JOIN CONVERSATION
//      */

//     socket.on("joinConversation", async (conversationId) => {
//       try {
//         const conversation = await Conversation.findOne({
//           _id: conversationId,

//           participants: userId,
//         });

//         if (!conversation) {
//           return socket.emit("socketError", {
//             message: "Conversation not found",
//           });
//         }

//         socket.join(`conversation:${conversationId}`);

//         console.log(`User ${userId} joined conversation ${conversationId}`);
//       } catch (error) {
//         socket.emit("socketError", {
//           message: "Unable to join conversation",
//         });
//       }
//     });

//     /*
//      * SEND MESSAGE
//      */

//     socket.on("sendMessage", async (data) => {
//       try {
//         const { conversationId, receiverId, text } = data;

//         if (!conversationId || !receiverId || !text?.trim()) {
//           return socket.emit("socketError", {
//             message: "Invalid message data",
//           });
//         }

//         /*
//          * VERIFY CONVERSATION
//          */

//         const conversation = await Conversation.findOne({
//           _id: conversationId,

//           participants: userId,
//         });

//         if (!conversation) {
//           return socket.emit("socketError", {
//             message: "Conversation not found",
//           });
//         }

//         /*
//          * VERIFY RECEIVER
//          */

//         const receiverExists = conversation.participants.some(
//           (participant) => participant.toString() === receiverId,
//         );

//         if (!receiverExists) {
//           return socket.emit("socketError", {
//             message: "Receiver is not part of this conversation",
//           });
//         }

//         /*
//          * SAVE MESSAGE
//          */

//         const message = await Message.create({
//           conversation: conversationId,

//           sender: userId,

//           receiver: receiverId,

//           text: text.trim(),
//         });

//         /*
//          * POPULATE MESSAGE
//          */

//         await message.populate("sender", "name email avatar");

//         await message.populate("receiver", "name email avatar");

//         /*
//          * UPDATE LAST MESSAGE
//          */

//         conversation.lastMessage = message._id;

//         await conversation.save();

//         /*
//          * EMIT TO CHAT ROOM
//          */

//         io.to(`conversation:${conversationId}`).emit("newMessage", message);

//         /*
//          * NOTIFY RECEIVER
//          */

//         io.to(`user:${receiverId}`).emit("conversationUpdated", {
//           conversationId,
//           message,
//         });
//       } catch (error) {
//         console.error("Send message error:", error);

//         socket.emit("socketError", {
//           message: "Message could not be sent",
//         });
//       }
//     });

//     /*
//      * TYPING
//      */

//     socket.on("typing", ({ conversationId, isTyping }) => {
//       socket.to(`conversation:${conversationId}`).emit("userTyping", {
//         userId,
//         isTyping,
//       });
//     });

//     /*
//      * MESSAGE READ
//      */

//     socket.on("messageRead", async ({ messageId, conversationId }) => {
//       try {
//         const message = await Message.findOne({
//           _id: messageId,

//           conversation: conversationId,

//           receiver: userId,
//         });

//         if (!message) {
//           return;
//         }

//         message.isRead = true;

//         await message.save();

//         io.to(`conversation:${conversationId}`).emit("messageRead", {
//           messageId,
//           conversationId,
//         });
//       } catch (error) {
//         console.error("Message read error:", error);
//       }
//     });

//     /*
//      * DISCONNECT
//      */

//     // socket.on("disconnect", async () => {
//     //   console.log(`Socket disconnected: ${userId}`);     // previously used before redis implementation.

//     //   /*
//     //    * IMPORTANT:
//     //    *
//     //    * A user may have multiple
//     //    * browser tabs/devices.
//     //    *
//     //    * Check whether another
//     //    * socket exists.
//     //    */

//     //   const sockets = await io.in(`user:${userId}`).fetchSockets();

//     //   if (sockets.length === 0) {
//     //     const lastSeen = new Date();

//     //     await User.findByIdAndUpdate(userId, {
//     //       isOnline: false,
//     //       lastSeen,
//     //     });

//     //     io.emit("userOffline", {
//     //       userId,
//     //       lastSeen,
//     //     });
//     //   }
//     // });

//     socket.on("disconnect", async () => {
//       try {
//         console.log(`Socket disconnected: ${userId}`);

//         /*

//      * REMOVE THIS SOCKET FROM REDIS

//      */

//         await redisClient.sRem(
//           `user:${userId}:sockets`,

//           socket.id,
//         );

//         /*

//      * CHECK WHETHER USER HAS

//      * ANY OTHER ACTIVE SOCKET

//      */

//         const remainingSockets = await redisClient.sCard(
//           `user:${userId}:sockets`,
//         );

//         /*

//      * USER IS COMPLETELY OFFLINE

//      */

//         if (remainingSockets === 0) {
//           /*

//        * Remove empty Redis key

//        */

//           await redisClient.del(`user:${userId}:sockets`);

//           const lastSeen = new Date();

//           /*

//        * OPTIONAL:

//        * Keep MongoDB isOnline/lastSeen

//        * for persistent user information.

//        */

//           await User.findByIdAndUpdate(
//             userId,

//             {
//               isOnline: false,

//               lastSeen,
//             },
//           );

//           /*

//        * INFORM OTHER USERS

//        */

//           io.emit("userOffline", {
//             userId,

//             lastSeen,
//           });
//         }
//       } catch (error) {
//         console.error(
//           "Disconnect presence error:",

//           error,
//         );
//       }
//     });
//   });
// };

// import jwt from "jsonwebtoken";

// import config from "../config/config.js";
// import User from "../models/user.model.js";
// import Conversation from "../models/conversation.model.js";
// import Message from "../models/message.model.js";
// import redisClient from "../config/redis.js";

// export const setupSocket = (io) => {
//   /*
//    * ============================================================
//    * SOCKET AUTHENTICATION
//    * ============================================================
//    */

//   io.use(async (socket, next) => {
//     try {
//       const token = socket.handshake.auth?.token;

//       if (!token) {
//         return next(new Error("Authentication required"));
//       }

//       const decoded = jwt.verify(token, config.JWT_SECRET);

//       const user = await User.findById(decoded.userId);

//       if (!user) {
//         return next(new Error("User not found"));
//       }

//       socket.user = user;

//       next();
//     } catch (error) {
//       console.error("Socket authentication error:", error.message);

//       next(new Error("Invalid socket authentication"));
//     }
//   });

//   /*
//    * ============================================================
//    * CONNECTION
//    * ============================================================
//    */

//   io.on("connection", async (socket) => {
//     const userId = socket.user._id.toString();

//     console.log(`Socket connected: ${userId}`);

//     /*
//      * ==========================================================
//      * PERSONAL USER ROOM
//      * ==========================================================
//      */

//     socket.join(`user:${userId}`);

//     /*
//      * ==========================================================
//      * REDIS ONLINE STATUS
//      * ==========================================================
//      *
//      * Store every socket belonging to this user.
//      *
//      * Example:
//      *
//      * user:123:sockets
//      *      ├── socketA
//      *      └── socketB
//      *
//      * This allows multiple tabs/devices.
//      */

//     const socketKey = `user:${userId}:sockets`;

//     const existingSocketCount = await redisClient.sCard(socketKey);

//     await redisClient.sAdd(socketKey, socket.id);

//     /*

//  * GET CURRENT ONLINE USERS

//  */

//     socket.on("getOnlineUsers", async () => {
//       try {
//         const keys = await redisClient.keys("user:*:sockets");

//         const onlineUserIds = keys.map((key) => {
//           return key.split(":")[1];
//         });

//         socket.emit(
//           "onlineUsers",

//           onlineUserIds,
//         );
//       } catch (error) {
//         console.error(
//           "Get online users error:",

//           error,
//         );

//         socket.emit(
//           "onlineUsers",

//           [],
//         );
//       }
//     });

//     /*
//      * ==========================================================
//      * UPDATE MONGODB ONLINE STATUS
//      * ==========================================================
//      *
//      * MongoDB can still maintain the persistent
//      * online/lastSeen information.
//      */

//     await User.findByIdAndUpdate(userId, {
//       isOnline: true,
//       lastSeen: null,
//     });

//     /*
//      * ==========================================================
//      * INFORM OTHER USERS
//      * ==========================================================
//      *
//      * Only emit userOnline when this is the user's
//      * first active socket.
//      *
//      * If user already had another tab/device open,
//      * don't unnecessarily emit userOnline again.
//      */

//     if (existingSocketCount === 0) {
//       socket.broadcast.emit("userOnline", {
//         userId,
//       });
//     }

//     /*
//      * ============================================================
//      * JOIN CONVERSATION
//      * ============================================================
//      */

//     socket.on("joinConversation", async (conversationId) => {
//       try {
//         const conversation = await Conversation.findOne({
//           _id: conversationId,
//           participants: userId,
//         });

//         if (!conversation) {
//           return socket.emit("socketError", {
//             message: "Conversation not found",
//           });
//         }

//         socket.join(`conversation:${conversationId}`);

//         console.log(`User ${userId} joined conversation ${conversationId}`);
//       } catch (error) {
//         console.error("Join conversation error:", error);

//         socket.emit("socketError", {
//           message: "Unable to join conversation",
//         });
//       }
//     });

//     /*
//      * ============================================================
//      * SEND MESSAGE
//      * ============================================================
//      */

//     socket.on("sendMessage", async (data) => {
//       try {
//         const { conversationId, receiverId, text } = data;

//         /*
//          * VALIDATE MESSAGE DATA
//          */

//         if (!conversationId || !receiverId || !text?.trim()) {
//           return socket.emit("socketError", {
//             message: "Invalid message data",
//           });
//         }

//         /*
//          * ======================================================
//          * VERIFY CONVERSATION
//          * ======================================================
//          */

//         const conversation = await Conversation.findOne({
//           _id: conversationId,
//           participants: userId,
//         });

//         if (!conversation) {
//           return socket.emit("socketError", {
//             message: "Conversation not found",
//           });
//         }

//         /*
//          * ======================================================
//          * VERIFY RECEIVER
//          * ======================================================
//          */

//         const receiverExists = conversation.participants.some(
//           (participant) => participant.toString() === receiverId,
//         );

//         if (!receiverExists) {
//           return socket.emit("socketError", {
//             message: "Receiver is not part of this conversation",
//           });
//         }

//         /*
//          * ======================================================
//          * SAVE MESSAGE
//          * ======================================================
//          */

//         const message = await Message.create({
//           conversation: conversationId,

//           sender: userId,

//           receiver: receiverId,

//           text: text.trim(),

//           isRead: false,
//         });

//         /*
//          * ======================================================
//          * POPULATE MESSAGE
//          * ======================================================
//          */

//         await message.populate("sender", "name email avatar");

//         await message.populate("receiver", "name email avatar");

//         /*
//          * ======================================================
//          * UPDATE LAST MESSAGE
//          * ======================================================
//          */

//         conversation.lastMessage = message._id;

//         await conversation.save();

//         /*
//          * ======================================================
//          * EMIT MESSAGE TO CONVERSATION
//          * ======================================================
//          */

//         io.to(`conversation:${conversationId}`).emit("newMessage", message);

//         /*
//          * ======================================================
//          * NOTIFY RECEIVER
//          * ======================================================
//          *
//          * This works even if receiver hasn't joined
//          * the conversation room.
//          */

//         io.to(`user:${receiverId}`).emit("conversationUpdated", {
//           conversationId,
//           message,
//         });
//       } catch (error) {
//         console.error("Send message error:", error);

//         socket.emit("socketError", {
//           message: "Message could not be sent",
//         });
//       }
//     });

//     /*
//      * ============================================================
//      * TYPING
//      * ============================================================
//      */

//     socket.on("typing", ({ conversationId, isTyping }) => {
//       socket.to(`conversation:${conversationId}`).emit("userTyping", {
//         userId,
//         isTyping,
//       });
//     });

//     /*
//      * ============================================================
//      * INDIVIDUAL MESSAGE READ
//      * ============================================================
//      *
//      * We keep this event for your existing frontend
//      * functionality.
//      *
//      * The important improvement is that the read receipt
//      * is sent to the SENDER'S personal room.
//      */

//     socket.on("messageRead", async ({ messageId, conversationId }) => {
//       try {
//         const message = await Message.findOne({
//           _id: messageId,

//           conversation: conversationId,

//           receiver: userId,
//         });

//         if (!message) {
//           return;
//         }

//         /*
//          * Already read
//          */

//         if (message.isRead) {
//           return;
//         }

//         message.isRead = true;

//         await message.save();

//         /*
//          * Notify sender directly.
//          */

//         io.to(`user:${message.sender.toString()}`).emit("messageRead", {
//           messageId,
//           conversationId,
//         });
//       } catch (error) {
//         console.error("Message read error:", error);
//       }
//     });

//     /*
//      * ============================================================
//      * MARK ENTIRE CONVERSATION AS READ
//      * ============================================================
//      *
//      * THIS IS THE IMPORTANT NEW EVENT.
//      *
//      * It solves the problem where:
//      *
//      * User A sends message
//      *        ↓
//      * User B is offline
//      *        ↓
//      * User B comes online
//      *        ↓
//      * User B opens conversation
//      *        ↓
//      * All unread messages are marked as read
//      */

//     socket.on("markConversationRead", async ({ conversationId }) => {
//       try {
//         /*
//          * ======================================================
//          * VALIDATE CONVERSATION ID
//          * ======================================================
//          */

//         if (!conversationId) {
//           return;
//         }

//         /*
//          * ======================================================
//          * VERIFY USER IS PART OF CONVERSATION
//          * ======================================================
//          */

//         const conversation = await Conversation.findOne({
//           _id: conversationId,

//           participants: userId,
//         });

//         if (!conversation) {
//           return;
//         }

//         /*
//          * ======================================================
//          * FIND UNREAD MESSAGES
//          * ======================================================
//          *
//          * Only messages received by the current user.
//          */

//         const unreadMessages = await Message.find({
//           conversation: conversationId,

//           receiver: userId,

//           isRead: false,
//         }).select("_id sender");

//         /*
//          * Nothing to update.
//          */

//         if (unreadMessages.length === 0) {
//           return;
//         }

//         /*
//          * ======================================================
//          * MARK ALL UNREAD MESSAGES AS READ
//          * ======================================================
//          */

//         await Message.updateMany(
//           {
//             conversation: conversationId,

//             receiver: userId,

//             isRead: false,
//           },
//           {
//             $set: {
//               isRead: true,
//             },
//           },
//         );

//         /*
//          * ======================================================
//          * CREATE MESSAGE ID LIST
//          * ======================================================
//          */

//         const messageIds = unreadMessages.map((message) =>
//           message._id.toString(),
//         );

//         /*
//          * ======================================================
//          * FIND UNIQUE SENDERS
//          * ======================================================
//          */

//         const senderIds = [
//           ...new Set(
//             unreadMessages.map((message) => message.sender.toString()),
//           ),
//         ];

//         /*
//          * ======================================================
//          * NOTIFY SENDERS
//          * ======================================================
//          *
//          * We use their personal room:
//          *
//          * user:<senderId>
//          *
//          * Therefore sender doesn't need to be inside
//          * the conversation room.
//          */

//         senderIds.forEach((senderId) => {
//           io.to(`user:${senderId}`).emit("messagesRead", {
//             conversationId,

//             messageIds,
//           });
//         });

//         /*
//          * ======================================================
//          * OPTIONAL: INFORM CURRENT USER
//          * ======================================================
//          *
//          * This allows the receiver's own UI to immediately
//          * update its local message state as well.
//          */

//         socket.emit("messagesRead", {
//           conversationId,
//           messageIds,
//         });
//       } catch (error) {
//         console.error("Mark conversation read error:", error);
//       }
//     });

//     /*
//      * ============================================================
//      * DISCONNECT
//      * ============================================================
//      */

//     socket.on("disconnect", async () => {
//       try {
//         console.log(`Socket disconnected: ${userId}`);

//         /*
//          * ======================================================
//          * REMOVE SOCKET FROM REDIS
//          * ======================================================
//          */

//         await redisClient.sRem(`user:${userId}:sockets`, socket.id);

//         /*
//          * ======================================================
//          * CHECK REMAINING SOCKETS
//          * ======================================================
//          */

//         const remainingSockets = await redisClient.sCard(
//           `user:${userId}:sockets`,
//         );

//         /*
//          * ======================================================
//          * USER COMPLETELY OFFLINE
//          * ======================================================
//          */

//         if (remainingSockets === 0) {
//           /*
//            * Remove empty Redis Set.
//            */

//           await redisClient.del(`user:${userId}:sockets`);

//           const lastSeen = new Date();

//           /*
//            * Update MongoDB.
//            */

//           await User.findByIdAndUpdate(userId, {
//             isOnline: false,
//             lastSeen,
//           });

//           /*
//            * Inform other users.
//            */

//           io.emit("userOffline", {
//             userId,
//             lastSeen,
//           });
//         }
//       } catch (error) {
//         console.error("Disconnect presence error:", error);
//       }
//     });
//   });
// };

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

export const setupSocket = (io) => {
  /*
   * ============================================================
   * SOCKET AUTHENTICATION
   * ============================================================
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
   * ============================================================
   * CONNECTION
   * ============================================================
   */

  io.on("connection", async (socket) => {
    const userId = socket.user._id.toString();

    console.log(`Socket connected: ${userId}`);

    /*
     * ==========================================================
     * PERSONAL USER ROOM
     * ==========================================================
     *
     * Every socket of the same user joins:
     *
     * user:<userId>
     *
     * Example:
     *
     * user:123
     *
     * This is useful for:
     *
     * - notifications
     * - read receipts
     * - conversation updates
     */

    socket.join(`user:${userId}`);

    const emitConversationUpdate = (
      participantIds,
      conversationId,
      message,
      updatedAt,
    ) => {
      participantIds.forEach((participantId) => {
        io.to(`user:${participantId}`).emit("conversationUpdated", {
          conversationId,
          message,
          updatedAt,
        });
      });
    };

    /*
     * ==========================================================
     * USER → SOCKET ID MAPPING
     * ==========================================================
     */

    try {
      const result = await addUserSocket(userId, socket.id);

      console.log(`Socket ${socket.id} mapped to user ${userId}`);

      console.log(`Existing sockets: ${result.existingSocketCount}`);

      console.log(`Current socket count: ${result.socketCount}`);

      /*
       * ========================================================
       * UPDATE ONLINE STATUS
       * ========================================================
       */

      await User.findByIdAndUpdate(userId, {
        isOnline: true,
        lastSeen: null,
      });

      /*
       * ========================================================
       * INFORM OTHER USERS
       * ========================================================
       */

      if (result.existingSocketCount === 0) {
        socket.broadcast.emit("userOnline", {
          userId,
        });
      }
    } catch (error) {
      console.error("User socket mapping error:", error);
    }

    /*
     * ==========================================================
     * GET CURRENT ONLINE USERS
     * ==========================================================
     */

    socket.on("getOnlineUsers", async () => {
      try {
        const onlineUserIds = await getOnlineUsers();

        console.log("Sending online users:", onlineUserIds);

        socket.emit("onlineUsers", onlineUserIds);
      } catch (error) {
        console.error("Get online users error:", error);

        socket.emit("onlineUsers", []);
      }
    });

    /*
     * ============================================================
     * JOIN CONVERSATION
     * ============================================================
     */

    socket.on("joinConversation", async (conversationId) => {
      try {
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
        });

        if (!conversation) {
          return socket.emit("socketError", {
            message: "Conversation not found",
          });
        }

        socket.join(`conversation:${conversationId}`);

        console.log(`User ${userId} joined conversation ${conversationId}`);
      } catch (error) {
        console.error("Join conversation error:", error);

        socket.emit("socketError", {
          message: "Unable to join conversation",
        });
      }
    });

    /*
     * ============================================================
     * SEND MESSAGE
     * ============================================================
     */

    socket.on("sendMessage", async (data) => {
      try {
        const { conversationId, receiverId, text, messageType = "text" } = data;

        /*
         * ======================================================
         * VALIDATE MESSAGE
         * ======================================================
         */

        if (!conversationId || !receiverId || !text?.trim()) {
          return socket.emit("socketError", {
            message: "Invalid message data",
          });
        }

        /*
         * ======================================================
         * VERIFY CONVERSATION
         * ======================================================
         */

        const conversation = await Conversation.findOne({
          _id: conversationId,

          participants: userId,
        });

        if (!conversation) {
          return socket.emit("socketError", {
            message: "Conversation not found",
          });
        }

        /*
         * ======================================================
         * VERIFY RECEIVER
         * ======================================================
         */

        const receiverExists = conversation.participants.some(
          (participant) => participant.toString() === receiverId,
        );

        if (!receiverExists) {
          return socket.emit("socketError", {
            message: "Receiver is not part of this conversation",
          });
        }

        /*
         * ======================================================
         * CREATE MESSAGE
         * ======================================================
         */

        const normalizedMessageType =
          ["text", "image", "file"].includes(messageType) ? messageType : "text";

        const message = await Message.create({
          conversation: conversationId,

          sender: userId,

          receiver: receiverId,

          text: text.trim(),

          messageType: normalizedMessageType,

          isRead: false,
        });

        /*
         * ======================================================
         * POPULATE MESSAGE
         * ======================================================
         */

        await message.populate("sender", "name email avatar");

        await message.populate("receiver", "name email avatar");

        /*
         * ======================================================
         * UPDATE CONVERSATION
         * ======================================================
         */

        conversation.lastMessage = message._id;

        await conversation.save();

        /*
         * ======================================================
         * GET RECEIVER SOCKETS FROM REDIS
         * ======================================================
         *
         * Redis lookup:
         *
         * user:<receiverId>:sockets
         *
         * Example:
         *
         * user:ABC:sockets
         *
         *   socket1
         *   socket2
         *   socket3
         */

        const receiverSockets = await getUserSockets(receiverId);

        console.log(`Receiver ${receiverId} sockets:`, receiverSockets);

        /*
         * ======================================================
         * REAL-TIME MESSAGE ROUTING
         * ======================================================
         *
         * Send the actual message directly
         * to every active socket of the receiver.
         *
         * This means:
         *
         * Tab 1 → gets message
         * Tab 2 → gets message
         * Mobile → gets message
         *
         * if all are connected.
         */

        receiverSockets.forEach((socketId) => {
          io.to(socketId).emit("newMessage", message);
        });

        /*
         * ======================================================
         * SEND MESSAGE TO SENDER
         * ======================================================
         *
         * The sender also needs the message
         * in the UI.
         *
         * We send it only to the current socket.
         *
         * This avoids depending on whether
         * the sender has joined the conversation room.
         */

        socket.emit("newMessage", message);

        /*
         * ======================================================
         * CONVERSATION UPDATE
         * ======================================================
         *
         * Broadcast to every participant's personal room
         * so sidebars stay in sync across tabs/devices.
         */

        emitConversationUpdate(
          conversation.participants.map((participant) =>
            participant.toString(),
          ),
          conversationId,
          message,
          conversation.updatedAt,
        );
      } catch (error) {
        console.error("Send message error:", error);

        socket.emit("socketError", {
          message: "Message could not be sent",
        });
      }
    });

    /*
     * ============================================================
     * TYPING
     * ============================================================
     */

    socket.on("typing", ({ conversationId, isTyping }) => {
      socket.to(`conversation:${conversationId}`).emit("userTyping", {
        userId,
        conversationId,
        isTyping,
      });
    });

    /*
     * ============================================================
     * EDIT MESSAGE
     * ============================================================
     */

    socket.on("editMessage", async ({ conversationId, messageId, text }) => {
      try {
        if (!conversationId || !messageId || !text?.trim()) {
          return socket.emit("socketError", {
            message: "Invalid message data",
          });
        }

        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
        });

        if (!conversation) {
          return socket.emit("socketError", {
            message: "Conversation not found",
          });
        }

        const message = await Message.findOne({
          _id: messageId,
          conversation: conversationId,
          sender: userId,
          isDeleted: false,
        });

        if (!message) {
          return socket.emit("socketError", {
            message: "Message not found",
          });
        }

        message.text = text.trim();
        message.editedAt = new Date();

        await message.save();

        await message.populate("sender", "name email avatar");
        await message.populate("receiver", "name email avatar");

        io.to(`conversation:${conversationId}`).emit("messageUpdated", message);

        const senderSockets = await getUserSockets(userId);

        senderSockets.forEach((socketId) => {
          io.to(socketId).emit("messageUpdated", message);
        });

        if (conversation.lastMessage?.toString() === messageId) {
          emitConversationUpdate(
            conversation.participants.map((participant) =>
              participant.toString(),
            ),
            conversationId,
            message,
            message.updatedAt,
          );
        }
      } catch (error) {
        console.error("Edit message error:", error);

        socket.emit("socketError", {
          message: "Message could not be edited",
        });
      }
    });

    /*
     * ============================================================
     * DELETE MESSAGE
     * ============================================================
     */

    socket.on("deleteMessage", async ({ conversationId, messageId }) => {
      try {
        if (!conversationId || !messageId) {
          return socket.emit("socketError", {
            message: "Invalid message data",
          });
        }

        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
        });

        if (!conversation) {
          return socket.emit("socketError", {
            message: "Conversation not found",
          });
        }

        const message = await Message.findOne({
          _id: messageId,
          conversation: conversationId,
          sender: userId,
          isDeleted: false,
        });

        if (!message) {
          return socket.emit("socketError", {
            message: "Message not found",
          });
        }

        message.isDeleted = true;
        message.deletedAt = new Date();

        await message.save();

        await message.populate("sender", "name email avatar");
        await message.populate("receiver", "name email avatar");

        io.to(`conversation:${conversationId}`).emit("messageDeleted", message);

        const senderSockets = await getUserSockets(userId);

        senderSockets.forEach((socketId) => {
          io.to(socketId).emit("messageDeleted", message);
        });

        if (conversation.lastMessage?.toString() === messageId) {
          const replacementMessage = await Message.findOne({
            conversation: conversationId,
            isDeleted: false,
            _id: {
              $ne: messageId,
            },
          })
            .sort({
              createdAt: -1,
            })
            .populate("sender", "name email avatar")
            .populate("receiver", "name email avatar");

          conversation.lastMessage = replacementMessage?._id || null;

          await conversation.save();

          emitConversationUpdate(
            conversation.participants.map((participant) =>
              participant.toString(),
            ),
            conversationId,
            replacementMessage || null,
            conversation.updatedAt,
          );
        }
      } catch (error) {
        console.error("Delete message error:", error);

        socket.emit("socketError", {
          message: "Message could not be deleted",
        });
      }
    });

    /*
     * ============================================================
     * INDIVIDUAL MESSAGE READ
     * ============================================================
     */

    socket.on("messageRead", async ({ messageId, conversationId }) => {
      try {
        const message = await Message.findOne({
          _id: messageId,

          conversation: conversationId,

          receiver: userId,
        });

        if (!message) {
          return;
        }

        /*
         * Already read
         */

        if (message.isRead) {
          return;
        }

        /*
         * Mark as read
         */

        message.isRead = true;

        await message.save();

        /*
         * Notify sender
         */

        io.to(`user:${message.sender.toString()}`).emit("messageRead", {
          messageId,
          conversationId,
        });
      } catch (error) {
        console.error("Message read error:", error);
      }
    });

    /*
     * ============================================================
     * MARK ENTIRE CONVERSATION AS READ
     * ============================================================
     */

    socket.on("markConversationRead", async ({ conversationId }) => {
      try {
        if (!conversationId) {
          return;
        }

        /*
         * Verify conversation
         */

        const conversation = await Conversation.findOne({
          _id: conversationId,

          participants: userId,
        });

        if (!conversation) {
          return;
        }

        /*
         * Find unread messages
         */

        const unreadMessages = await Message.find({
          conversation: conversationId,

          receiver: userId,

          isRead: false,
        }).select("_id sender");

        if (unreadMessages.length === 0) {
          return;
        }

        /*
         * Mark unread messages as read
         */

        await Message.updateMany(
          {
            conversation: conversationId,

            receiver: userId,

            isRead: false,
          },
          {
            $set: {
              isRead: true,
            },
          },
        );

        /*
         * Message IDs
         */

        const messageIds = unreadMessages.map((message) =>
          message._id.toString(),
        );

        /*
         * Unique senders
         */

        const senderIds = [
          ...new Set(
            unreadMessages.map((message) => message.sender.toString()),
          ),
        ];

        /*
         * Notify senders
         */

        senderIds.forEach((senderId) => {
          io.to(`user:${senderId}`).emit("messagesRead", {
            conversationId,
            messageIds,
          });
        });

        /*
         * Update current user's UI
         */

        socket.emit("messagesRead", {
          conversationId,
          messageIds,
        });
      } catch (error) {
        console.error("Mark conversation read error:", error);
      }
    });

    /*
     * ============================================================
     * DISCONNECT
     * ============================================================
     */

    socket.on("disconnect", async () => {
      try {
        console.log(`Socket disconnected: ${userId}`);

        /*
         * Remove socket from Redis
         */

        const remainingSockets = await removeUserSocket(userId, socket.id);

        console.log(`Remaining sockets for ${userId}:`, remainingSockets);

        /*
         * User completely offline
         */

        if (remainingSockets === 0) {
          const lastSeen = new Date();

          /*
           * Update MongoDB
           */

          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen,
          });

          /*
           * Notify other users
           */

          io.emit("userOffline", {
            userId,
            lastSeen,
          });

          console.log(`User ${userId} is completely offline`);
        }
      } catch (error) {
        console.error("Disconnect presence error:", error);
      }
    });
  });
};

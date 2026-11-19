import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({
        message: "Conversation not found",
      });
    }

    const now = new Date();
    const messages = await Message.find({
      conversation: conversationId,
      deletedFor: { $ne: req.user._id },
      $or: [
        { expiresAt: null },
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: now } },
      ],
    })
      .populate("sender", "name email avatar")
      .populate("receiver", "name email avatar")
      .populate("reactions.user", "name avatar")
      .populate("mentions", "name email avatar")
      .populate("poll.options.votes", "name avatar")
      .populate({
        path: "replyTo",
        select: "text messageType mediaUrl fileName sender isDeleted",
        populate: {
          path: "sender",
          select: "name",
        },
      })
      .sort({
        createdAt: 1,
      });

    res.json(messages);
  } catch (error) {
    console.error("Get messages error:", error);

    res.status(500).json({
      message: "Unable to fetch messages",
    });
  }
};

/*
 * TOGGLE STAR MESSAGE
 */
export const toggleStarMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const message = await Message.findById(id)
      .populate("sender", "name email avatar")
      .populate("receiver", "name email avatar")
      .populate("reactions.user", "name avatar")
      .populate("mentions", "name email avatar")
      .populate("poll.options.votes", "name avatar")
      .populate({
        path: "replyTo",
        select: "text messageType mediaUrl fileName sender isDeleted",
        populate: { path: "sender", select: "name" },
      });

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    const userIdStr = req.user._id.toString();
    const starIndex = (message.starredBy || []).findIndex(
      (sId) => sId.toString() === userIdStr,
    );

    if (starIndex > -1) {
      message.starredBy.splice(starIndex, 1);
    } else {
      message.starredBy.push(req.user._id);
    }

    await message.save();
    res.json(message);
  } catch (error) {
    console.error("Toggle star message error:", error);
    res.status(500).json({ message: "Unable to update star status" });
  }
};

/*
 * GET STARRED MESSAGES
 */
export const getStarredMessages = async (req, res) => {
  try {
    const filter = {
      starredBy: req.user._id,
      deletedFor: { $ne: req.user._id },
    };

    if (req.query.conversationId) {
      filter.conversation = req.query.conversationId;
    }

    const messages = await Message.find(filter)
      .populate("sender", "name email avatar")
      .populate("receiver", "name email avatar")
      .populate("conversation", "groupName isGroup participants")
      .sort({ createdAt: -1 });

    res.json(messages);
  } catch (error) {
    console.error("Get starred messages error:", error);
    res.status(500).json({ message: "Unable to fetch starred messages" });
  }
};

/*
 * GET CONVERSATION MEDIA, DOCS, AND LINKS
 */
export const getConversationMedia = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const messages = await Message.find({
      conversation: conversationId,
      isDeleted: false,
      deletedFor: { $ne: req.user._id },
    })
      .populate("sender", "name avatar")
      .sort({ createdAt: -1 });

    const urlRegex = /(https?:\/\/[^\s]+)/gi;

    const media = [];
    const docs = [];
    const links = [];

    for (const msg of messages) {
      if (msg.messageType === "image" || msg.messageType === "video") {
        media.push(msg);
      } else if (msg.messageType === "file" || msg.messageType === "audio") {
        docs.push(msg);
      }

      if (msg.text && urlRegex.test(msg.text)) {
        const matches = msg.text.match(urlRegex) || [];
        matches.forEach((url) => {
          links.push({
            _id: `${msg._id}-${url}`,
            url,
            messageId: msg._id,
            createdAt: msg.createdAt,
            sender: msg.sender,
          });
        });
      }
    }

    res.json({ media, docs, links });
  } catch (error) {
    console.error("Get conversation media error:", error);
    res.status(500).json({ message: "Unable to fetch conversation media" });
  }
};

/*
 * GET MESSAGE INFO (READ BY DETAILS)
 */
export const getMessageInfo = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Message.findById(id)
      .populate("sender", "name email avatar statusEmoji statusText")
      .populate("readBy", "name email avatar statusEmoji statusText isOnline lastSeen")
      .populate("readReceipts.user", "name email avatar statusEmoji statusText isOnline lastSeen");

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    const conversation = await Conversation.findOne({
      _id: message.conversation,
      participants: req.user._id,
    }).populate("participants", "name email avatar statusEmoji statusText isOnline lastSeen");

    if (!conversation) {
      return res.status(403).json({ message: "You are not a participant in this conversation" });
    }

    // Build read receipt map
    const readReceiptMap = new Map();
    (message.readReceipts || []).forEach((receipt) => {
      if (receipt.user?._id) {
        readReceiptMap.set(receipt.user._id.toString(), receipt.readAt);
      }
    });

    const senderIdStr = (message.sender?._id || message.sender)?.toString();

    const readUsers = [];
    const remainingUsers = [];

    const readUserIds = new Set(
      (message.readBy || []).map((u) => (u._id || u).toString()),
    );

    for (const participant of conversation.participants || []) {
      const pIdStr = participant._id.toString();
      if (pIdStr === senderIdStr) {
        continue;
      }

      if (readUserIds.has(pIdStr)) {
        readUsers.push({
          user: participant,
          readAt: readReceiptMap.get(pIdStr) || message.readAt || message.updatedAt || message.createdAt,
        });
      } else {
        remainingUsers.push({
          user: participant,
        });
      }
    }

    res.json({
      message: {
        _id: message._id,
        text: message.text,
        messageType: message.messageType,
        mediaUrl: message.mediaUrl,
        fileName: message.fileName,
        createdAt: message.createdAt,
        sender: message.sender,
        status: message.status,
      },
      isGroup: conversation.isGroup,
      totalParticipants: Math.max(0, (conversation.participants || []).length - 1),
      readBy: readUsers,
      deliveredTo: remainingUsers,
    });
  } catch (error) {
    console.error("Get message info error:", error);
    res.status(500).json({ message: "Unable to fetch message info" });
  }
};

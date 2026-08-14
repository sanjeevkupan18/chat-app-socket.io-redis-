import Conversation from "../models/conversation.model.js";

import Message from "../models/message.model.js";

const createParticipantKey = (user1, user2) => {
  return [user1.toString(), user2.toString()].sort().join("_");
};

const attachUnreadCount = async (conversation, userId) => {
  const unreadCount = await Message.countDocuments({
    conversation: conversation._id,
    receiver: userId,
    isRead: false,
  });

  return {
    ...(conversation.toObject ? conversation.toObject() : conversation),
    unreadCount,
  };
};

export const createConversation = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    if (currentUserId.toString() === userId.toString()) {
      return res.status(400).json({
        message: "You cannot chat with yourself",
      });
    }

    const participantKey = createParticipantKey(currentUserId, userId);

    let conversation = await Conversation.findOne({
      participantKey,
    })
      .populate("participants", "name email avatar isOnline lastSeen")
      .populate("lastMessage");

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [currentUserId, userId],

        participantKey,
      });

      conversation = await conversation.populate(
        "participants",
        "name email avatar isOnline lastSeen",
      );
    }

    res.status(200).json(await attachUnreadCount(conversation, currentUserId));
  } catch (error) {
    console.error("Create conversation error:", error);

    res.status(500).json({
      message: "Unable to create conversation",
    });
  }
};

export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate("participants", "name email avatar isOnline lastSeen")
      .populate("lastMessage")
      .sort({
        updatedAt: -1,
      });

    const conversationsWithUnreadCount = await Promise.all(
      conversations.map((conversation) =>
        attachUnreadCount(conversation, req.user._id),
      ),
    );

    res.json(conversationsWithUnreadCount);
  } catch (error) {
    console.error("Get conversations error:", error);

    res.status(500).json({
      message: "Unable to fetch conversations",
    });
  }
};

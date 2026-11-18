import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";

const createParticipantKey = (user1, user2) => {
  return [user1.toString(), user2.toString()].sort().join("_");
};

const attachUnreadCount = async (conversation, userId) => {
  let unreadCount = 0;

  if (conversation.isGroup) {
    unreadCount = await Message.countDocuments({
      conversation: conversation._id,
      sender: { $ne: userId },
      readBy: { $ne: userId },
      deletedFor: { $ne: userId },
    });
  } else {
    unreadCount = await Message.countDocuments({
      conversation: conversation._id,
      receiver: userId,
      isRead: false,
      deletedFor: { $ne: userId },
    });
  }

  const convObj = conversation.toObject ? conversation.toObject() : conversation;
  const isPinned = Boolean(
    convObj.pinnedBy?.some((id) => (id._id || id).toString() === userId.toString()),
  );

  return {
    ...convObj,
    unreadCount,
    isPinned,
  };
};

export const createConversation = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    if (currentUserId.toString() === userId.toString()) {
      return res.status(400).json({ message: "You cannot chat with yourself" });
    }

    const participantKey = createParticipantKey(currentUserId, userId);

    let conversation = await Conversation.findOne({ participantKey })
      .populate("participants", "name email avatar isOnline lastSeen hideLastSeen")
      .populate("lastMessage");

    if (!conversation) {
      conversation = await Conversation.create({
        isGroup: false,
        participants: [currentUserId, userId],
        participantKey,
      });

      conversation = await conversation.populate(
        "participants",
        "name email avatar isOnline lastSeen hideLastSeen",
      );
    }

    res.status(200).json(await attachUnreadCount(conversation, currentUserId));
  } catch (error) {
    console.error("Create conversation error:", error);
    res.status(500).json({ message: "Unable to create conversation" });
  }
};

export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate("participants", "name email avatar isOnline lastSeen hideLastSeen")
      .populate("groupAdmins", "name email avatar")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "name" },
      })
      .sort({ updatedAt: -1 });

    const conversationsWithUnreadCount = await Promise.all(
      conversations.map((conversation) =>
        attachUnreadCount(conversation, req.user._id),
      ),
    );

    conversationsWithUnreadCount.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    res.json(conversationsWithUnreadCount);
  } catch (error) {
    console.error("Get conversations error:", error);
    res.status(500).json({ message: "Unable to fetch conversations" });
  }
};

/*
 * TOGGLE PIN CONVERSATION
 */
export const togglePinConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const conversation = await Conversation.findOne({
      _id: id,
      participants: req.user._id,
    })
      .populate("participants", "name email avatar isOnline lastSeen hideLastSeen")
      .populate("groupAdmins", "name email avatar")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "name" },
      });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const currentUserIdStr = req.user._id.toString();
    const isPinnedIndex = (conversation.pinnedBy || []).findIndex(
      (pId) => pId.toString() === currentUserIdStr,
    );

    if (isPinnedIndex > -1) {
      conversation.pinnedBy.splice(isPinnedIndex, 1);
    } else {
      conversation.pinnedBy.push(req.user._id);
    }

    await conversation.save();
    res.json(await attachUnreadCount(conversation, req.user._id));
  } catch (error) {
    console.error("Toggle pin conversation error:", error);
    res.status(500).json({ message: "Unable to update pin status" });
  }
};

/*
 * CREATE GROUP CHAT
 */
export const createGroupConversation = async (req, res) => {
  try {
    const { groupName, groupDescription = "", groupIcon = "", memberIds = [] } = req.body;

    if (!groupName?.trim()) {
      return res.status(400).json({ message: "Group name is required" });
    }

    const uniqueMembers = Array.from(
      new Set([req.user._id.toString(), ...(memberIds || []).map((id) => id.toString())]),
    );

    if (uniqueMembers.length < 2) {
      return res.status(400).json({ message: "Please select at least 1 other participant" });
    }

    const group = await Conversation.create({
      isGroup: true,
      groupName: groupName.trim(),
      groupDescription: groupDescription.trim(),
      groupIcon: groupIcon.trim(),
      groupAdmins: [req.user._id],
      participants: uniqueMembers,
    });

    const systemMsg = await Message.create({
      conversation: group._id,
      sender: req.user._id,
      text: `${req.user.name} created group "${group.groupName}"`,
      messageType: "system",
      readBy: [req.user._id],
    });

    group.lastMessage = systemMsg._id;
    await group.save();

    await group.populate("participants", "name email avatar isOnline lastSeen hideLastSeen");
    await group.populate("groupAdmins", "name email avatar");
    await group.populate("lastMessage");

    res.status(201).json(await attachUnreadCount(group, req.user._id));
  } catch (error) {
    console.error("Create group error:", error);
    res.status(500).json({ message: "Unable to create group" });
  }
};

/*
 * UPDATE GROUP INFO (Name, Description, Icon)
 */
export const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { groupName, groupDescription, groupIcon } = req.body;

    const group = await Conversation.findOne({
      _id: id,
      isGroup: true,
      participants: req.user._id,
    });

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isAdmin = group.groupAdmins.some(
      (admin) => admin.toString() === req.user._id.toString(),
    );

    if (!isAdmin) {
      return res.status(403).json({ message: "Only group admins can edit group settings" });
    }

    if (groupName && groupName.trim()) {
      group.groupName = groupName.trim();
    }
    if (typeof groupDescription === "string") {
      group.groupDescription = groupDescription.trim();
    }
    if (typeof groupIcon === "string") {
      group.groupIcon = groupIcon.trim();
    }

    await group.save();
    await group.populate("participants", "name email avatar isOnline lastSeen hideLastSeen");
    await group.populate("groupAdmins", "name email avatar");
    await group.populate("lastMessage");

    res.json(await attachUnreadCount(group, req.user._id));
  } catch (error) {
    console.error("Update group error:", error);
    res.status(500).json({ message: "Unable to update group" });
  }
};

/*
 * ADD OR REMOVE GROUP MEMBERS (or leave group)
 */
export const updateGroupMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // action: "add" | "remove"
    const memberId = req.body.memberId || req.body.userId;

    if (!["add", "remove"].includes(action) || !memberId) {
      return res.status(400).json({ message: "Valid action and memberId are required" });
    }

    const group = await Conversation.findOne({
      _id: id,
      isGroup: true,
      participants: req.user._id,
    });

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isAdmin = group.groupAdmins.some(
      (admin) => admin.toString() === req.user._id.toString(),
    );
    const isSelfLeaving = action === "remove" && memberId.toString() === req.user._id.toString();

    if (!isAdmin && !isSelfLeaving) {
      return res.status(403).json({ message: "Only group admins can add or remove members" });
    }

    const targetUser = await User.findById(memberId);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    let systemText = "";

    if (action === "add") {
      if (group.participants.some((p) => p.toString() === memberId.toString())) {
        return res.status(400).json({ message: "User is already in this group" });
      }
      group.participants.push(memberId);
      systemText = `${req.user.name} added ${targetUser.name}`;
    } else if (action === "remove") {
      group.participants = group.participants.filter(
        (p) => p.toString() !== memberId.toString(),
      );
      group.groupAdmins = group.groupAdmins.filter(
        (a) => a.toString() !== memberId.toString(),
      );

      // If the leaving admin was the last admin, assign the next available member as admin
      if (group.groupAdmins.length === 0 && group.participants.length > 0) {
        group.groupAdmins.push(group.participants[0]);
      }

      systemText = isSelfLeaving
        ? `${targetUser.name} left the group`
        : `${req.user.name} removed ${targetUser.name}`;
    }

    const systemMsg = await Message.create({
      conversation: group._id,
      sender: req.user._id,
      text: systemText,
      messageType: "system",
      readBy: [req.user._id],
    });

    group.lastMessage = systemMsg._id;
    await group.save();

    await group.populate("participants", "name email avatar isOnline lastSeen hideLastSeen");
    await group.populate("groupAdmins", "name email avatar");
    await group.populate("lastMessage");

    const attached = await attachUnreadCount(group, req.user._id);
    attached.systemMessage = systemMsg;
    res.json(attached);
  } catch (error) {
    console.error("Update group members error:", error);
    res.status(500).json({ message: "Unable to update group members" });
  }
};

/*
 * PROMOTE OR DEMOTE ADMINS
 */
export const updateGroupAdmins = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // action: "promote" | "demote"
    const memberId = req.body.memberId || req.body.userId;

    if (!["promote", "demote"].includes(action) || !memberId) {
      return res.status(400).json({ message: "Valid action and memberId are required" });
    }

    const group = await Conversation.findOne({
      _id: id,
      isGroup: true,
      participants: req.user._id,
    });

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isAdmin = group.groupAdmins.some(
      (admin) => admin.toString() === req.user._id.toString(),
    );

    if (!isAdmin) {
      return res.status(403).json({ message: "Only group admins can manage roles" });
    }

    if (action === "promote") {
      if (!group.groupAdmins.some((a) => a.toString() === memberId.toString())) {
        group.groupAdmins.push(memberId);
      }
    } else if (action === "demote") {
      group.groupAdmins = group.groupAdmins.filter(
        (a) => a.toString() !== memberId.toString(),
      );
    }

    await group.save();
    await group.populate("participants", "name email avatar isOnline lastSeen hideLastSeen");
    await group.populate("groupAdmins", "name email avatar");
    await group.populate("lastMessage");

    res.json(await attachUnreadCount(group, req.user._id));
  } catch (error) {
    console.error("Update group admins error:", error);
    res.status(500).json({ message: "Unable to update group admins" });
  }
};

/**
 * Mark all messages in a conversation as read by the authenticated user
 * PUT /api/conversations/:id/read
 */
export const markConversationAsRead = async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (conversation.isGroup) {
      // Mark all unread group messages for this user
      await Message.updateMany(
        {
          conversation: conversationId,
          sender: { $ne: userId },
          readBy: { $ne: userId },
        },
        { $addToSet: { readBy: userId } },
      );
    } else {
      // Mark all unread 1-on-1 messages for this user
      await Message.updateMany(
        {
          conversation: conversationId,
          receiver: userId,
          status: { $ne: "read" },
        },
        { $set: { isRead: true, status: "read", readAt: new Date() } },
      );
    }

    res.json({ success: true, conversationId });
  } catch (err) {
    console.error("markConversationAsRead error:", err);
    res.status(500).json({ message: "Failed to mark conversation as read" });
  }
};

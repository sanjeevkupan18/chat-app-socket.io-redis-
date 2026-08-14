import User from "../models/user.model.js";

const sanitizeUser = (user) => {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    isOnline: user.isOnline,
    lastSeen: user.lastSeen,
  };
};

export const searchUsers = async (req, res) => {
  try {
    const search = req.query.search?.trim();

    if (!search) {
      return res.json([]);
    }

    const users = await User.find({
      _id: {
        $ne: req.user._id,
      },

      $or: [
        {
          name: {
            $regex: search,
            $options: "i",
          },
        },

        {
          email: {
            $regex: search,
            $options: "i",
          },
        },
      ],
    })
      .select("name email avatar isOnline lastSeen")
      .limit(20);

    res.json(users);
  } catch (error) {
    console.error("Search users error:", error);

    res.status(500).json({
      message: "Unable to search users",
    });
  }
};

export const getMyProfile = async (req, res) => {
  try {
    res.json({
      user: sanitizeUser(req.user),
    });
  } catch (error) {
    res.status(500).json({
      message: "Unable to fetch profile",
    });
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    const { name, avatar } = req.body;

    const updates = {};

    if (typeof name === "string") {
      const trimmedName = name.trim();

      if (trimmedName.length < 2 || trimmedName.length > 50) {
        return res.status(400).json({
          message: "Name must be between 2 and 50 characters",
        });
      }

      updates.name = trimmedName;
    }

    if (typeof avatar === "string") {
      updates.avatar = avatar.trim();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No profile changes were provided",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: updates,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({
      message: "Profile updated successfully",
      user: sanitizeUser(updatedUser),
    });
  } catch (error) {
    console.error("Update profile error:", error);

    res.status(500).json({
      message: "Unable to update profile",
    });
  }
};

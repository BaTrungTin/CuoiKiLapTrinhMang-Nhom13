import { io, getReceiverSocketId } from "../lib/socket.js"; // dùng socket.js
import Group from "../models/group.model.js";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";

// Lấy danh sách user cho sidebar (ngoại trừ chính mình)
export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    const filteredUsers = await User.find({
      _id: { $ne: loggedInUserId },
    }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Lấy tin nhắn giữa mình và 1 user khác
export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });

    // Đánh dấu tin nhắn từ userToChatId là đã đọc
    const updateResult = await Message.updateMany(
      { senderId: userToChatId, receiverId: myId, isRead: false },
      { isRead: true }
    );

    console.log("📖 Marked messages as read:", updateResult.modifiedCount, "messages");

    // Emit updated unread counts
    const unreadCounts = await Message.aggregate([
      {
        $match: {
          receiverId: myId,
          isRead: false,
          groupId: { $exists: false }
        }
      },
      {
        $group: {
          _id: "$senderId",
          count: { $sum: 1 }
        }
      }
    ]);
    
    const unreadMap = {};
    unreadCounts.forEach(item => {
      unreadMap[item._id.toString()] = item.count;
    });

    const receiverSocketId = getReceiverSocketId(myId);
    if (receiverSocketId) {
      console.log("📬 Emitting updated unread counts after marking as read:", unreadMap);
      io.to(receiverSocketId).emit("unreadCountsUpdate", unreadMap);
    }

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getMessages:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Gửi tin nhắn
export const sendMessage = async (req, res) => {
  try {
    const { text, image, groupId } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    if (!text && !image) {
      return res.status(400).json({ error: "Tin nhắn rỗng" });
    }

    let imageUrl;
    if (image) {
      // Kiểm tra xem có phải là base64 image không
      if (image.startsWith('data:image')) {
        // Lưu trực tiếp base64 image
        imageUrl = image;
      } else {
        // Thử upload lên Cloudinary nếu có cấu hình
        try {
          if (process.env.CLOUDINARY_CLOUD_NAME && 
              process.env.CLOUDINARY_API_KEY && 
              process.env.CLOUDINARY_API_SECRET) {
            const uploadResponse = await cloudinary.uploader.upload(image, {
              folder: "chat_images",
            });
            imageUrl = uploadResponse.secure_url;
          } else {
            // Fallback: lưu URL trực tiếp
            imageUrl = image;
          }
        } catch (cloudinaryError) {
          console.log("Cloudinary upload failed, using direct URL:", cloudinaryError.message);
          // Fallback: lưu URL trực tiếp
          imageUrl = image;
        }
      }
    }

    const newMessage = new Message({
      senderId,
      receiverId: groupId ? undefined : receiverId,
      groupId: groupId || undefined,
      text,
      image: imageUrl,
    });

    await newMessage.save();

    // Realtime emit
    if (groupId) {
      io.to(`group:${groupId}`).emit("newGroupMessage", newMessage);
    } else {
      const receiverSocketId = getReceiverSocketId(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("newMessage", newMessage);
        
        // Emit unread counts update
        const unreadCounts = await Message.aggregate([
          {
            $match: {
              receiverId: receiverId,
              isRead: false,
              groupId: { $exists: false }
            }
          },
          {
            $group: {
              _id: "$senderId",
              count: { $sum: 1 }
            }
          }
        ]);
        
        const unreadMap = {};
        unreadCounts.forEach(item => {
          unreadMap[item._id.toString()] = item.count;
        });
        
        console.log("📬 Emitting unread counts to", receiverId, ":", unreadMap);
        io.to(receiverSocketId).emit("unreadCountsUpdate", unreadMap);
      }
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendMessage:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Xóa tin nhắn
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ error: "Tin nhắn không tồn tại" });
    }

    // Chỉ người gửi mới có thể xóa tin nhắn
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Bạn không có quyền xóa tin nhắn này" });
    }

    // Xóa tin nhắn
    await Message.findByIdAndDelete(messageId);

    // Emit event để thông báo xóa tin nhắn
    if (message.groupId) {
      io.to(`group:${message.groupId}`).emit("messageDeleted", { messageId });
    } else {
      const receiverSocketId = getReceiverSocketId(message.receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageDeleted", { messageId });
      }
    }

    res.status(200).json({ message: "Tin nhắn đã được xóa" });
  } catch (error) {
    console.error("Error in deleteMessage:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Lấy số tin nhắn chưa đọc cho mỗi user
export const getUnreadCounts = async (req, res) => {
  try {
    const myId = req.user._id;

    // Lấy số tin nhắn chưa đọc từ mỗi user
    const unreadCounts = await Message.aggregate([
      {
        $match: {
          receiverId: myId,
          isRead: false,
          groupId: { $exists: false }
        }
      },
      {
        $group: {
          _id: "$senderId",
          count: { $sum: 1 }
        }
      }
    ]);

    // Chuyển đổi thành object với key là userId
    const unreadMap = {};
    unreadCounts.forEach(item => {
      unreadMap[item._id.toString()] = item.count;
    });

    res.status(200).json(unreadMap);
  } catch (error) {
    console.error("Error in getUnreadCounts:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};



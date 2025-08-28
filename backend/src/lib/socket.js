import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const server = http.createServer(app);

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// Map quản lý user online: userId -> socketId
const userSocketMap = {};

// Map quản lý video calls: callId -> {caller, receiver, status}
const videoCallMap = {};

// Hàm helper
export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// Khởi tạo Socket.IO
export const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) {
    userSocketMap[userId] = socket.id;
    console.log("User online:", userId);
    
    // Emit userOnline event to all clients
    socket.broadcast.emit("userOnline", userId);
  }

  // gửi danh sách user online
  const onlineUserIds = Object.keys(userSocketMap);
  console.log("Online users:", onlineUserIds);
  io.emit("getOnlineUsers", onlineUserIds);

  // Xử lý request lấy danh sách user online
  socket.on("getOnlineUsers", (callback) => {
    callback(Object.keys(userSocketMap));
  });

  // Join/leave group rooms for realtime
  socket.on("joinGroups", (groupIds = []) => {
    try {
      groupIds.forEach((gid) => socket.join(`group:${gid}`));
    } catch (e) {
      console.log("joinGroups error", e.message);
    }
  });

  socket.on("leaveGroupRoom", (groupId) => {
    try {
      socket.leave(`group:${groupId}`);
    } catch (e) {
      console.log("leaveGroupRoom error", e.message);
    }
  });

  // ===== VIDEO CALL SIGNALING =====
  
  // Initiate call (voice or video)
  socket.on("initiateCall", ({ receiverId, callType = "voice" }) => {
    const callerId = userId;
    const callId = `${callerId}-${receiverId}-${Date.now()}`;
    
    videoCallMap[callId] = {
      callerId,
      receiverId,
      callType,
      status: "ringing",
      startTime: new Date()
    };
    
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("incomingCall", {
        callId,
        callerId,
        callType,
        callerInfo: { userId: callerId } // Có thể populate thêm thông tin
      });
      
      // Set call timeout (30 seconds)
      setTimeout(() => {
        const call = videoCallMap[callId];
        if (call && call.status === "ringing") {
          // Auto reject if still ringing
          io.to(receiverSocketId).emit("callEnded", { callId, reason: "timeout" });
          io.to(socket.id).emit("callEnded", { callId, reason: "timeout" });
          delete videoCallMap[callId];
        }
      }, 30000);
    }
    
    // Confirm call initiated
    socket.emit("callInitiated", { callId, receiverId });
    console.log("Call initiated event sent to caller:", callId);
  });

  // Accept call
  socket.on("acceptCall", ({ callId }) => {
    console.log("Accept call request:", callId, "from user:", userId);
    const call = videoCallMap[callId];
    if (call && call.receiverId === userId) {
      call.status = "accepted";
      call.acceptTime = new Date();
      
      const callerSocketId = getReceiverSocketId(call.callerId);
      if (callerSocketId) {
        console.log("Sending callAccepted to caller:", callerSocketId);
        io.to(callerSocketId).emit("callAccepted", { callId });
      }
      
      // Join both users to call room
      socket.join(`call:${callId}`);
      io.to(callerSocketId).emit("joinCallRoom", { callId });
    } else {
      console.log("Call not found or user not authorized:", callId, userId);
    }
  });

  // Reject call
  socket.on("rejectCall", ({ callId }) => {
    const call = videoCallMap[callId];
    if (call && call.receiverId === userId) {
      call.status = "rejected";
      call.endTime = new Date();
      
      const callerSocketId = getReceiverSocketId(call.callerId);
      if (callerSocketId) {
        io.to(callerSocketId).emit("callRejected", { callId });
      }
      
      delete videoCallMap[callId];
    }
  });

  // End call
  socket.on("endCall", ({ callId }) => {
    const call = videoCallMap[callId];
    if (call && (call.callerId === userId || call.receiverId === userId)) {
      call.status = "ended";
      call.endTime = new Date();
      
      // Notify both parties
      io.to(`call:${callId}`).emit("callEnded", { callId });
      
      // Leave call room
      socket.leave(`call:${callId}`);
      
      delete videoCallMap[callId];
    }
  });

  // WebRTC signaling
  socket.on("offer", ({ callId, offer }) => {
    console.log("Offer received for call:", callId, "from user:", userId);
    const call = videoCallMap[callId];
    if (call) {
      const targetId = call.callerId === userId ? call.receiverId : call.callerId;
      const targetSocketId = getReceiverSocketId(targetId);
      if (targetSocketId) {
        console.log("Forwarding offer to:", targetSocketId);
        io.to(targetSocketId).emit("offer", { callId, offer });
      }
    }
  });

  socket.on("answer", ({ callId, answer }) => {
    console.log("Answer received for call:", callId, "from user:", userId);
    const call = videoCallMap[callId];
    if (call) {
      const targetId = call.callerId === userId ? call.receiverId : call.callerId;
      const targetSocketId = getReceiverSocketId(targetId);
      if (targetSocketId) {
        console.log("Forwarding answer to:", targetSocketId);
        io.to(targetSocketId).emit("answer", { callId, answer });
      }
    }
  });

  socket.on("iceCandidate", ({ callId, candidate }) => {
    console.log("ICE candidate received for call:", callId, "from user:", userId);
    const call = videoCallMap[callId];
    if (call) {
      const targetId = call.callerId === userId ? call.receiverId : call.callerId;
      const targetSocketId = getReceiverSocketId(targetId);
      if (targetSocketId) {
        console.log("Forwarding ICE candidate to:", targetSocketId);
        io.to(targetSocketId).emit("iceCandidate", { callId, candidate });
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
    if (userId) {
      delete userSocketMap[userId];
      console.log("User offline:", userId);
      
      // Emit userOffline event to all clients
      socket.broadcast.emit("userOffline", userId);
      
      // End any active calls
      Object.keys(videoCallMap).forEach(callId => {
        const call = videoCallMap[callId];
        if (call.callerId === userId || call.receiverId === userId) {
          io.to(`call:${callId}`).emit("callEnded", { callId, reason: "user_disconnected" });
          delete videoCallMap[callId];
        }
      });
    }

    const onlineUserIds = Object.keys(userSocketMap);
    console.log("Online users after disconnect:", onlineUserIds);
    io.emit("getOnlineUsers", onlineUserIds);
  });
});

export { app, server };

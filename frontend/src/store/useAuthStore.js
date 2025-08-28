import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const BASE_URL =
  import.meta.env.MODE === "development" 
    ? "http://localhost:5001" 
    : "https://cuoikilaptrinhmang.onrender.com";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  // Check auth khi load app
  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      console.log("❌ Error khi checkAuth", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  // Signup
  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Something went wrong");
      return false;
    } finally {
      set({ isSigningUp: false });
    }
  },

  // Login
  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Login failed");
      return false;
    } finally {
      set({ isLoggingIn: false });
    }
  },

  // Logout
  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Logout failed");
    }
  },

  // Update profile
  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated");
    } catch (error) {
      console.log("❌ Error updating profile:", error);
      toast.error(error?.response?.data?.message || "Failed to update profile");
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  // Kết nối socket
  connectSocket: () => {
    const { authUser, socket } = get();
    if (!authUser) return;

    if (!socket) {
      console.log("🔌 Connecting socket to:", BASE_URL);
      const newSocket = io(BASE_URL, {
        withCredentials: true,
        query: { userId: authUser._id.toString() }, // 👈 ép string
      });

      newSocket.on("connect", () => {
        console.log("✅ Socket connected successfully");
      });

      newSocket.on("connect_error", (error) => {
        console.error("❌ Socket connection error:", error);
      });

      newSocket.on("getOnlineUsers", (userIds) => {
        console.log("📡 Received online users:", userIds);
        set({ onlineUsers: userIds });
      });

      // Listen for real-time online status updates
      newSocket.on("userOnline", (userId) => {
        console.log("👤 User went online:", userId);
        const { onlineUsers } = get();
        if (!onlineUsers.includes(userId)) {
          set({ onlineUsers: [...onlineUsers, userId] });
        }
      });

      newSocket.on("userOffline", (userId) => {
        console.log("👤 User went offline:", userId);
        const { onlineUsers } = get();
        set({ onlineUsers: onlineUsers.filter(id => id !== userId) });
      });

      // Listen for unread counts updates
      newSocket.on("unreadCountsUpdate", (unreadCounts) => {
        console.log("📬 Unread counts updated:", unreadCounts);
        // Update unread counts in chat store
        import("./useChatStore").then(({ useChatStore }) => {
          useChatStore.getState().setUnreadCounts(unreadCounts);
        });
      });

      set({ socket: newSocket });
    }
  },

  // Ngắt kết nối socket
  disconnectSocket: () => {
    const { socket } = get();
    if (socket && socket.connected) {
      socket.off("getOnlineUsers");
      socket.off("userOnline");
      socket.off("userOffline");
      socket.off("unreadCountsUpdate");
      socket.disconnect();
      set({ socket: null, onlineUsers: [] });
    }
  },
}));

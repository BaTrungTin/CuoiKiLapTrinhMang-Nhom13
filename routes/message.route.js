import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getUsersForSidebar,
  sendMessage,
  deleteMessage,
  getUnreadCounts,
} from "../controllers/message.controller.js";
import { getMessages } from "../controllers/message.controller.js";

const router = express.Router();

router.get("/user", protectRoute, getUsersForSidebar);
router.get("/unread", protectRoute, getUnreadCounts);
router.get("/:id", protectRoute, getMessages);

router.post("/send/:id", protectRoute, sendMessage);
router.delete("/:messageId", protectRoute, deleteMessage);

export default router;

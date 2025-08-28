import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { Trash2, MoreVertical } from "lucide-react";
import toast from "react-hot-toast";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    selectedGroup,
    listenMessages,
    notListenMessages,
    deleteMessage,
  } = useChatStore();
  const { authUser } = useAuthStore();

  const messageEndRef = useRef(null);
  const [messageMenuOpen, setMessageMenuOpen] = useState(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (messageMenuOpen && !event.target.closest('.message-menu')) {
        setMessageMenuOpen(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [messageMenuOpen]);

  useEffect(() => {
    if (selectedUser?._id) {
      getMessages(selectedUser._id, "dm");
      listenMessages();
      return () => notListenMessages();
    }
    if (selectedGroup?._id) {
      getMessages(selectedGroup._id, "group");
      listenMessages();
      return () => notListenMessages();
    }
  }, [selectedUser?._id, selectedGroup?._id, getMessages, listenMessages, notListenMessages]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const handleDeleteMessage = async (messageId) => {
    if (window.confirm("Bạn có chắc muốn xóa tin nhắn này?")) {
      await deleteMessage(messageId);
      setMessageMenuOpen(null);
    }
  };

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message._id}
            className={`chat group ${
              message.senderId === authUser._id ? "chat-end" : "chat-start"
            }`}
            ref={messageEndRef}
          >
            <div className=" chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={
                    message.senderId === authUser._id
                      ? authUser.profilePic || "/avatar.png"
                      : selectedGroup
                        ? "/avatar.png"
                        : selectedUser.profilePic || "/avatar.png"
                  }
                  alt="profile pic"
                />
              </div>
            </div>
            <div className="chat-header mb-1 flex items-center justify-between">
              <time className="text-xs opacity-50 ml-1">
                {formatMessageTime(message.createdAt)}
              </time>
              {message.senderId === authUser._id && !(message.text && (message.text.startsWith("👋") || message.text.startsWith("👑") || message.text.startsWith("👢"))) && !message.groupId && (
                <div className="relative message-menu">
                  <button
                    onClick={() => setMessageMenuOpen(messageMenuOpen === message._id ? null : message._id)}
                    className="btn btn-ghost btn-xs btn-circle opacity-0 group-hover:opacity-50 hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="w-3 h-3" />
                  </button>
                  {messageMenuOpen === message._id && (
                    <div className="absolute right-0 top-8 bg-base-100 border border-base-300 rounded-lg shadow-lg z-10 min-w-[120px] animate-in fade-in-0 zoom-in-95">
                      <button
                        onClick={() => handleDeleteMessage(message._id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-error/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Xóa tin nhắn
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className={`chat-bubble flex flex-col ${message.groupId && !message.image && message.text?.startsWith("👋") ? "bg-base-200 text-base-content" : ""}`}>
              {message.image && (
                <img
                  src={message.image}
                  alt="Attachment"
                  className="sm:max-w-[200px] rounded-md mb-2"
                />
              )}
              {message.text && (
                <p className="whitespace-pre-wrap break-words">
                  {message.text}
                </p>
              )}
            </div>
          </div>
        ))}
        <div ref={messageEndRef} />
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;

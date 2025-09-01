import React, { useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useVideoCallStore } from "../store/useVideoCallStore";
import { useAuthStore } from "../store/useAuthStore";
import { Phone, Video, MoreVertical, Users } from "lucide-react";
import GroupMembersModal from "./GroupMembersModal";
import GroupMenuModal from "./GroupMenuModal";

const ChatHeader = () => {
  const { selectedUser, selectedGroup, getGroups } = useChatStore();
  const { initiateCall } = useVideoCallStore();
  const { onlineUsers, authUser } = useAuthStore();
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);

  const handleVoiceCall = () => {
    if (selectedUser) {
      initiateCall(selectedUser._id, "voice");
    }
  };

  const handleVideoCall = () => {
    if (selectedUser) {
      initiateCall(selectedUser._id, "video");
    }
  };

  const handleUpdateGroup = () => {
    getGroups(); // Refresh groups list
  };

  if (!selectedUser && !selectedGroup) {
    return (
      <div className="bg-base-200 px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Select a chat to start messaging</h3>
        </div>
      </div>
    );
  }

  const displayName = selectedUser?.fullName || selectedGroup?.name;
  const displayImage = selectedUser?.profilePic || selectedGroup?.avatar || "/avatar.png";
  
  // Check if selected user is online using real-time status
  const isUserOnline = selectedUser ? onlineUsers.includes(selectedUser._id) : false;
  
  // Debug logging
  if (selectedUser) {
    console.log(`ChatHeader: User ${selectedUser.fullName} (${selectedUser._id}) online status:`, isUserOnline);
    console.log(`ChatHeader: Online users array:`, onlineUsers);
  }

  return (
    <div className="bg-base-200 px-4 py-3 border-b">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="avatar">
            <div className="w-10 h-10 rounded-full">
              <img src={displayImage} alt={displayName} />
            </div>
          </div>
          <div>
            <h3 className="font-semibold">{displayName}</h3>
            {selectedUser && (
              <p className="text-sm text-base-content/70">
                {isUserOnline ? "Online" : "Offline"}
              </p>
            )}
                         {selectedGroup && (
               <div className="text-sm text-base-content/70">
                 <p>{selectedGroup.members?.length || 0} thành viên</p>
                 {selectedGroup.createdBy === authUser._id && (
                   <p className="text-xs text-primary">Bạn là quản trị viên</p>
                 )}
               </div>
             )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Voice call button - only for direct messages */}
          {selectedUser && (
            <button
              onClick={handleVoiceCall}
              className="btn btn-ghost btn-sm btn-circle"
              title="Voice Call (Audio Only)"
            >
              <Phone className="w-5 h-5" />
            </button>
          )}

          {/* Video call button - only for direct messages */}
          {selectedUser && (
            <button
              onClick={handleVideoCall}
              className="btn btn-ghost btn-sm btn-circle"
              title="Video Call (Audio + Video)"
            >
              <Video className="w-5 h-5" />
            </button>
          )}

          {/* Group actions - only for groups */}
          {selectedGroup && (
            <button
              onClick={() => setShowMembersModal(true)}
              className="btn btn-ghost btn-sm btn-circle"
              title="Xem thành viên nhóm"
            >
              <Users className="w-5 h-5" />
            </button>
          )}

          {/* Menu button - for both users and groups */}
          <button 
            onClick={() => selectedGroup ? setShowGroupMenu(true) : null}
            className={`btn btn-ghost btn-sm btn-circle ${selectedGroup ? '' : 'opacity-50'}`}
            disabled={!selectedGroup}
            title={selectedGroup ? "Tùy chọn nhóm" : "Chỉ có sẵn cho nhóm"}
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Group Members Modal */}
      {selectedGroup && (
        <GroupMembersModal
          open={showMembersModal}
          onClose={() => setShowMembersModal(false)}
          groupId={selectedGroup._id}
        />
      )}

      {/* Group Menu Modal */}
      {selectedGroup && (
        <GroupMenuModal
          open={showGroupMenu}
          onClose={() => setShowGroupMenu(false)}
          group={selectedGroup}
          onUpdateGroup={handleUpdateGroup}
        />
      )}
    </div>
  );
};

export default ChatHeader;

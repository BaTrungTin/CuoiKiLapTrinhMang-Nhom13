import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, Plus } from "lucide-react";
import { useState } from "react";
import GroupCreateModal from "./GroupCreateModal";

const Sidebar = () => {
  const { 
    getUsers, 
    getGroups, 
    getUnreadCounts,
    users, 
    groups, 
    selectedUser, 
    selectedGroup, 
    setSelectedUser, 
    setSelectedGroup, 
    isUsersLoading, 
    isGroupsLoading,
    unreadCounts,
    clearUnreadCount
  } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [openModal, setOpenModal] = useState(false);

  useEffect(() => {
    getUsers();
    getGroups();
    getUnreadCounts();
  }, []); // Remove dependencies to avoid infinite re-renders

  // Debug unread counts changes
  useEffect(() => {
    console.log("🔄 Sidebar unread counts changed:", unreadCounts);
  }, [unreadCounts]);

  if ((isUsersLoading || isGroupsLoading) && !openModal) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
      {/* Header */}
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6" />
            <span className="font-medium hidden lg:block">Contacts</span>
          </div>
          <button
            className="btn btn-sm btn-ghost"
            title="New group"
            onClick={() => {
              console.log("Sidebar: open group modal click");
              setOpenModal(true);
            }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden lg:inline">New</span>
          </button>
        </div>
      </div>

      {/* Groups list */}
      <div className="overflow-y-auto w-full py-3">
        {groups.length > 0 && (
          <div className="px-3 pb-2 text-xs uppercase text-zinc-500">Groups</div>
        )}
        {groups.map((group) => (
          <button
            key={group._id}
            onClick={() => setSelectedGroup(group)}
            className={`w-full p-3 flex items-center gap-3 hover:bg-base-300 transition-colors ${
              selectedGroup?._id === group._id ? "bg-base-300 ring-1 ring-base-300" : ""
            }`}
          >
            <div className="relative mx-auto lg:mx-0">
              <img
                src={group.avatar || "/avatar.png"}
                alt={group.name}
                className="w-12 h-12 object-cover rounded-full"
              />
            </div>
            <div className="hidden lg:block text-left min-w-0">
              <div className="font-medium truncate">{group.name}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Users list */}
      <div className="overflow-y-auto w-full py-3">
        {users.length > 0 ? (
          users.map((user) => {
            // Debug online users array
            console.log("Online users array:", onlineUsers);
            console.log("Current user ID:", user._id);
            console.log("User ID type:", typeof user._id);
            
            const isOnline = onlineUsers.includes(user._id.toString());
            const unreadCount = unreadCounts[user._id] || 0;
            const hasUnread = unreadCount > 0;
            console.log(`User ${user.fullName} (${user._id}) online status:`, isOnline, "unread:", unreadCount);

            return (
              <button
                key={user._id}
                onClick={() => {
                  setSelectedUser(user);
                  if (hasUnread) {
                    clearUnreadCount(user._id);
                  }
                }}
                className={`w-full p-3 flex items-center gap-3 hover:bg-base-300 transition-colors ${
                  selectedUser?._id === user._id
                    ? "bg-base-300 ring-1 ring-base-300"
                    : ""
                }`}
              >
                <div className="relative mx-auto lg:mx-0">
                  <img
                    src={user.profilePic || "/avatar.png"}
                    alt={user.fullName}
                    className="w-12 h-12 object-cover rounded-full"
                  />
                  {/* Chấm xanh online */}
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 block w-3 h-3 rounded-full bg-green-500 ring-2 ring-white"></span>
                  )}
                  {/* Unread count badge for mobile */}
                  {hasUnread && (
                    <span className="absolute -top-1 -right-1 block w-5 h-5 rounded-full bg-primary text-primary-content text-xs font-medium flex items-center justify-center">
                      {unreadCount > 5 ? '5+' : unreadCount}
                    </span>
                  )}
                </div>

                <div className="hidden lg:block text-left min-w-0 flex-1">
                  <div className={`font-medium truncate ${hasUnread ? 'font-bold' : ''}`}>
                    {user.fullName}
                  </div>
                </div>
                
                {/* Unread count badge */}
                {hasUnread && (
                  <div className="hidden lg:flex items-center justify-center min-w-[20px] h-5 px-1 bg-primary text-primary-content text-xs font-medium rounded-full">
                    {unreadCount > 5 ? '5+' : unreadCount}
                  </div>
                )}
              </button>
            );
          })
        ) : (
          <div className="text-center text-zinc-500 py-4">No users</div>
        )}
      </div>
      <GroupCreateModal open={openModal} onClose={() => setOpenModal(false)} />
    </aside>
  );
};

export default Sidebar;

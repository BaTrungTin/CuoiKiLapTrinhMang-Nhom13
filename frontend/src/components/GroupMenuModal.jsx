import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { axiosInstance } from "../lib/axios";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Users, Image, LogOut, X, Plus } from "lucide-react";
import toast from "react-hot-toast";

const GroupMenuModal = ({ open, onClose, group, onUpdateGroup }) => {
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [showChangeAvatar, setShowChangeAvatar] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);
  const { addMembersToGroup, updateGroupAvatar, leaveGroup } = useChatStore();
  const { authUser } = useAuthStore();

  // Load available users for adding to group
  useEffect(() => {
    const loadAvailableUsers = async () => {
      if (!showAddMembers) return;
      try {
        const res = await axiosInstance.get("/messages/user");
        // Filter out users already in the group
        const groupMemberIds = group.members.map(m => m._id || m.toString());
        const available = res.data.filter(user => !groupMemberIds.includes(user._id));
        setAvailableUsers(available);
      } catch (error) {
        toast.error("Không thể tải danh sách người dùng");
      }
    };
    loadAvailableUsers();
  }, [showAddMembers, group.members]);

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) {
      toast.error("Vui lòng chọn ít nhất một người dùng");
      return;
    }

    setLoading(true);
    try {
      await addMembersToGroup(group._id, selectedUsers);
      setSelectedUsers([]);
      setShowAddMembers(false);
      onUpdateGroup?.();
      toast.success("Đã thêm thành viên vào nhóm");
    } catch (error) {
      toast.error("Không thể thêm thành viên");
    } finally {
      setLoading(false);
    }
  };

  const handleChangeAvatar = async () => {
    if (!avatarPreview) {
      toast.error("Vui lòng chọn hình ảnh");
      return;
    }

    setLoading(true);
    try {
      await updateGroupAvatar(group._id, avatarPreview);
      setAvatarPreview(null);
      setShowChangeAvatar(false);
      onUpdateGroup?.();
      toast.success("Đã cập nhật hình đại diện nhóm");
    } catch (error) {
      toast.error("Không thể cập nhật hình đại diện");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLeaveGroup = async () => {
    if (window.confirm("Bạn có chắc muốn rời khỏi nhóm này?")) {
      await leaveGroup(group._id);
      onClose();
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 z-[99999] flex items-center justify-center" onClick={onClose}>
      <div className="bg-base-100 border border-base-300 rounded-lg w-11/12 max-w-md p-4" onClick={(e) => e.stopPropagation()}>
                 <div className="flex items-center justify-between mb-4">
           <div>
             <h3 className="text-lg font-semibold">Tùy chọn nhóm</h3>
             {group.createdBy === authUser._id && (
               <p className="text-sm text-primary">Bạn là quản trị viên nhóm</p>
             )}
           </div>
           <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
             <X className="w-4 h-4" />
           </button>
         </div>

        {/* Main menu options */}
        {!showAddMembers && !showChangeAvatar && (
          <div className="space-y-2">
            <button
              onClick={() => setShowAddMembers(true)}
              className="w-full flex items-center gap-3 p-3 hover:bg-base-200 rounded-lg transition-colors"
            >
              <Users className="w-5 h-5" />
              <span>Thêm thành viên</span>
            </button>

            <button
              onClick={() => setShowChangeAvatar(true)}
              className="w-full flex items-center gap-3 p-3 hover:bg-base-200 rounded-lg transition-colors"
            >
              <Image className="w-5 h-5" />
              <span>Thay đổi hình đại diện</span>
            </button>

                         {/* Show leave group option for all members */}
             <button
               onClick={handleLeaveGroup}
               className="w-full flex items-center gap-3 p-3 hover:bg-error/10 text-error rounded-lg transition-colors"
             >
               <LogOut className="w-5 h-5" />
               <span>Rời khỏi nhóm</span>
             </button>
          </div>
        )}

        {/* Add members section */}
        {showAddMembers && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setShowAddMembers(false)}
                className="btn btn-ghost btn-sm"
              >
                ← Quay lại
              </button>
              <h4 className="font-semibold">Thêm thành viên</h4>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
              {availableUsers.length === 0 ? (
                <p className="text-center text-sm opacity-70 py-4">
                  Tất cả người dùng đã có trong nhóm
                </p>
              ) : (
                availableUsers.map((user) => (
                  <label key={user._id} className="flex items-center gap-3 p-2 hover:bg-base-200 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers([...selectedUsers, user._id]);
                        } else {
                          setSelectedUsers(selectedUsers.filter(id => id !== user._id));
                        }
                      }}
                      className="checkbox checkbox-sm"
                    />
                    <img src={user.profilePic || "/avatar.png"} className="w-8 h-8 rounded-full" />
                    <span className="flex-1">{user.fullName}</span>
                  </label>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowAddMembers(false)}
                className="btn btn-ghost flex-1"
              >
                Hủy
              </button>
              <button
                onClick={handleAddMembers}
                disabled={loading || selectedUsers.length === 0}
                className="btn btn-primary flex-1"
              >
                {loading ? "Đang thêm..." : `Thêm ${selectedUsers.length} thành viên`}
              </button>
            </div>
          </div>
        )}

        {/* Change avatar section */}
        {showChangeAvatar && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setShowChangeAvatar(false)}
                className="btn btn-ghost btn-sm"
              >
                ← Quay lại
              </button>
              <h4 className="font-semibold">Thay đổi hình đại diện</h4>
            </div>

            <div className="space-y-4">
              {avatarPreview && (
                <div className="flex justify-center">
                  <img
                    src={avatarPreview}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-lg border"
                  />
                </div>
              )}

              <div className="flex justify-center">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-outline gap-2"
                >
                  <Image className="w-4 h-4" />
                  Chọn hình ảnh
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowChangeAvatar(false)}
                  className="btn btn-ghost flex-1"
                >
                  Hủy
                </button>
                <button
                  onClick={handleChangeAvatar}
                  disabled={loading || !avatarPreview}
                  className="btn btn-primary flex-1"
                >
                  {loading ? "Đang cập nhật..." : "Cập nhật"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default GroupMenuModal;

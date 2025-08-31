import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { axiosInstance } from "../lib/axios";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { X, UserX } from "lucide-react";
import toast from "react-hot-toast";

const GroupMembersModal = ({ open, onClose, groupId }) => {
  const [members, setMembers] = useState([]);
  const [groupInfo, setGroupInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const { kickMember } = useChatStore();
  const { authUser } = useAuthStore();

  useEffect(() => {
    const load = async () => {
      if (!open || !groupId) return;
      setLoading(true);
      try {
        const res = await axiosInstance.get(`/groups/${groupId}`);
        setGroupInfo(res.data);
        setMembers(res.data?.members || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, groupId]);

  const handleKickMember = async (memberId, memberName) => {
    if (window.confirm(`Bạn có chắc muốn loại ${memberName} khỏi nhóm?`)) {
      await kickMember(groupId, memberId);
      // Reload members after kicking
      const res = await axiosInstance.get(`/groups/${groupId}`);
      setGroupInfo(res.data);
      setMembers(res.data?.members || []);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 z-[99999] flex items-center justify-center" onClick={onClose}>
      <div className="bg-base-100 border border-base-300 rounded-lg w-11/12 max-w-md p-4" onClick={(e) => e.stopPropagation()}>
        <div className="text-lg font-semibold mb-3">Thành viên nhóm</div>
        <div className="max-h-72 overflow-y-auto">
          {loading && <div className="py-6 text-center text-sm opacity-70">Đang tải...</div>}
          {!loading && members.length === 0 && (
            <div className="py-6 text-center text-sm opacity-70">Chưa có thành viên</div>
          )}
          {!loading && members.map((m) => (
            <div key={m._id} className="flex items-center justify-between p-2 hover:bg-base-200 rounded-lg">
              <div className="flex items-center gap-3">
                <img src={m.profilePic || "/avatar.png"} className="w-8 h-8 rounded-full" />
                <span className="truncate">{m.fullName}</span>
                {groupInfo && m._id === groupInfo.createdBy && (
                  <span className="text-xs bg-primary text-primary-content px-2 py-1 rounded">Admin</span>
                )}
              </div>
              
              {/* Show kick button only for group creator */}
              {groupInfo && groupInfo.createdBy === authUser._id && 
               m._id !== authUser._id && (
                <button
                  onClick={() => handleKickMember(m._id, m.fullName)}
                  className="btn btn-ghost btn-xs text-error hover:bg-error/10"
                  title="Loại khỏi nhóm"
                >
                  <UserX className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 text-right">
          <button className="btn btn-ghost" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default GroupMembersModal;



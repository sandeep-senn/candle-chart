import { useState } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Lock, ShieldAlert, ArrowLeft } from "lucide-react";

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put("/auth/reset-password", {
        currentPassword,
        newPassword,
      });
      toast.success("Security updated successfully.");
      localStorage.removeItem("token");
      navigate("/auth");
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't update password.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="soft-card w-full max-w-md p-10 md:p-12">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Update Security</h2>
          <p className="text-slate-500 mt-2 font-medium">Keep your account safe with a strong password.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Current Key</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-4 text-slate-300" size={18} />
              <input
                type="password"
                placeholder="Enter current password"
                className="w-full bg-slate-50 border-2 border-transparent focus:border-orange-500 focus:bg-white rounded-2xl px-12 py-4 text-sm font-bold text-slate-800 outline-none transition-all"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">New Secret Key</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-4 text-slate-300" size={18} />
              <input
                type="password"
                placeholder="Enter new password"
                className="w-full bg-slate-50 border-2 border-transparent focus:border-orange-500 focus:bg-white rounded-2xl px-12 py-4 text-sm font-bold text-slate-800 outline-none transition-all"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button className="human-button bg-slate-900 text-white w-full flex justify-center py-4 mt-8 hover:bg-slate-800 transition-colors">
            Update Security
          </button>
        </form>

        <button
          onClick={() => navigate(-1)}
          className="mt-8 flex items-center justify-center gap-2 text-slate-400 hover:text-orange-500 transition-colors text-xs font-bold uppercase tracking-widest mx-auto"
        >
          <ArrowLeft size={14} />
          Go Back
        </button>
      </div>
    </div>
  );
}

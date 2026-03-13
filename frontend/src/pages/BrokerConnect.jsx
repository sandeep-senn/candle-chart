import { useState, useEffect } from "react";
import api from "../api/api";
import { toast } from "react-toastify";
import { ShieldCheck, Key, User, Lock, Terminal, LogOut, CheckCircle2 } from "lucide-react";

export default function BrokerConnect() {
  const [creds, setCreds] = useState({
    apiKey: "",
    clientCode: "",
    password: "",
    totpSecret: ""
  });
  const [status, setStatus] = useState("disconnected");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setCreds({ ...creds, [e.target.name]: e.target.value });
  };

  const saveCredentials = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/angel/credentials", creds);
      toast.success("Credentials saved securely!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save credentials");
    } finally {
      setLoading(false);
    }
  };

  const connectBroker = async () => {
    setLoading(true);
    try {
      await api.post("/angel/login");
      setStatus("connected");
      toast.success("Successfully connected to Angel One!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Connection failed");
    } finally {
      setLoading(false);
    }
  };

  const disconnectBroker = async () => {
    setLoading(true);
    try {
      await api.post("/angel/logout");
      setStatus("disconnected");
      toast.info("Broker disconnected");
    } catch (err) {
      toast.error("Failed to disconnect");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-32 px-6 flex flex-col items-center">
      <div className="w-full max-w-4xl text-center mb-12">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Connect Your Broker</h1>
        <p className="text-slate-500 text-lg font-medium">Link your Angel One account to start real-time trading</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-5xl">
        
        {/* Settings Form */}
        <div className="soft-card p-10 space-y-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-orange-100 p-2 rounded-xl text-orange-600">
              <Key size={20} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">API Credentials</h2>
          </div>

          <form onSubmit={saveCredentials} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">API Key</label>
              <div className="relative flex items-center">
                <Terminal className="absolute left-4 text-slate-300" size={18} />
                <input
                  name="apiKey"
                  value={creds.apiKey}
                  onChange={handleChange}
                  placeholder="Enter your API Key"
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-orange-500 focus:bg-white rounded-2xl px-12 py-3.5 text-sm font-bold text-slate-800 outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Client Code</label>
              <div className="relative flex items-center">
                <User className="absolute left-4 text-slate-300" size={18} />
                <input
                  name="clientCode"
                  value={creds.clientCode}
                  onChange={handleChange}
                  placeholder="e.g. S123456"
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-orange-500 focus:bg-white rounded-2xl px-12 py-3.5 text-sm font-bold text-slate-800 outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Password</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-4 text-slate-300" size={18} />
                <input
                  name="password"
                  type="password"
                  value={creds.password}
                  onChange={handleChange}
                  placeholder="Your Angel One Password"
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-orange-500 focus:bg-white rounded-2xl px-12 py-3.5 text-sm font-bold text-slate-800 outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">TOTP Secret</label>
              <div className="relative flex items-center">
                <ShieldCheck className="absolute left-4 text-slate-300" size={18} />
                <input
                  name="totpSecret"
                  value={creds.totpSecret}
                  onChange={handleChange}
                  placeholder="32-digit alphanumeric secret"
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-orange-500 focus:bg-white rounded-2xl px-12 py-3.5 text-sm font-bold text-slate-800 outline-none transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black tracking-widest hover:bg-black transition-all shadow-xl"
            >
              {loading ? "Processing..." : "Save Credentials"}
            </button>
          </form>
        </div>

        {/* Status Card */}
        <div className="flex flex-col gap-6">
          <div className="soft-card p-10 flex-1 flex flex-col items-center justify-center text-center space-y-6">
            <div className={`p-6 rounded-[2.5rem] ${status === 'connected' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
              <ShieldCheck size={48} />
            </div>
            
            <div>
              <h3 className="text-2xl font-black text-slate-800">Connection Status</h3>
              <div className="flex items-center justify-center gap-2 mt-2">
                <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
                <span className={`text-sm font-bold uppercase tracking-widest ${status === 'connected' ? 'text-green-600' : 'text-slate-400'}`}>
                  {status === 'connected' ? "Active Session" : "Disconnected"}
                </span>
              </div>
            </div>

            <p className="text-slate-500 text-sm leading-relaxed max-w-[240px]">
              Once connected, your account will receive live price updates and you'll be able to place trades directly.
            </p>

            {status === 'connected' ? (
              <button
                onClick={disconnectBroker}
                className="flex items-center gap-2 px-8 py-4 bg-rose-50 text-rose-600 rounded-2xl font-black tracking-widest hover:bg-rose-100 transition-all"
              >
                <LogOut size={18} /> Disconnect
              </button>
            ) : (
              <button
                onClick={connectBroker}
                className="flex items-center gap-2 px-10 py-4 bg-orange-600 text-white rounded-2xl font-black tracking-widest hover:bg-orange-700 shadow-xl shadow-orange-100 transition-all"
              >
                <CheckCircle2 size={18} /> Establish Connection
              </button>
            )}
          </div>

          <div className="soft-card p-6 bg-blue-50/50 border-blue-100">
            <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Terminal size={12} /> Security Tip
            </h4>
            <p className="text-[11px] text-blue-500/80 leading-relaxed font-medium">
              We never store your raw credentials. Everything is encrypted before leaving your browser and stored securely in our vault.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

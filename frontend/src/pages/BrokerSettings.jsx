import { useState, useEffect } from "react";
import api from "../api/api";
import { toast } from "react-toastify";
import { Key, User, Lock, Fingerprint, LogIn, LogOut, Loader2, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";

export default function BrokerSettings() {
    const [creds, setCreds] = useState({
        apiKey: "",
        clientCode: "",
        password: "",
        totpSecret: ""
    });
    const [loading, setLoading] = useState(false);
    const [loginLoading, setLoginLoading] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    // Load existing status (mock check or simple fetch could be added)
    useEffect(() => {
        document.title = "Broker Settings | Candle";
    }, []);

    const handleChange = (e) => {
        setCreds({ ...creds, [e.target.name]: e.target.value.trim() });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post("/angel/credentials", creds);
            toast.success("Broker credentials saved securely.");
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to save credentials");
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async () => {
        setLoginLoading(true);
        try {
            const res = await api.post("/angel/login");
            if (res.data.success) {
                toast.success("Successfully connected to Angel One.");
                setIsConnected(true);
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Angel One Login Failed. Check your credentials.");
        } finally {
            setLoginLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await api.post("/angel/logout");
            toast.info("Broker session cleared.");
            setIsConnected(false);
        } catch (err) {
            toast.error("Failed to logout");
        }
    };

    return (
        <div className="min-h-screen pt-32 pb-20 px-6">
            <div className="max-w-4xl mx-auto space-y-12">
                
                {/* Header */}
                <div className="text-center">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Broker Connectivity</h1>
                    <p className="text-slate-500 font-medium max-w-xl mx-auto">
                        Securely link your Angel One account to enable real-time trading, live portfolios, and automated data syncing.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-10 items-start">
                    
                    {/* Credentials Form */}
                    <div className="soft-card p-10 space-y-8 h-full">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-orange-100 rounded-2xl text-orange-600">
                                <ShieldCheck size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">API Credentials</h3>
                        </div>

                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">API Key</label>
                                <div className="relative">
                                    <Key className="absolute left-4 top-4 text-slate-300" size={18} />
                                    <input
                                        name="apiKey"
                                        placeholder="Enter your API Key"
                                        value={creds.apiKey}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 border-2 border-transparent focus:border-orange-500 focus:bg-white rounded-2xl px-12 py-3.5 text-sm font-bold text-slate-800 outline-none transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Client Code</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-4 text-slate-300" size={18} />
                                    <input
                                        name="clientCode"
                                        placeholder="S123456"
                                        value={creds.clientCode}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 border-2 border-transparent focus:border-orange-500 focus:bg-white rounded-2xl px-12 py-3.5 text-sm font-bold text-slate-800 outline-none transition-all uppercase"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">App Password / MPIN</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-4 text-slate-300" size={18} />
                                    <input
                                        name="password"
                                        type="password"
                                        placeholder="Your MPIN"
                                        value={creds.password}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 border-2 border-transparent focus:border-orange-500 focus:bg-white rounded-2xl px-12 py-3.5 text-sm font-bold text-slate-800 outline-none transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">TOTP Secret Key (2FA)</label>
                                <div className="relative">
                                    <Fingerprint className="absolute left-4 top-4 text-slate-300" size={18} />
                                    <input
                                        name="totpSecret"
                                        placeholder="Base32 String"
                                        value={creds.totpSecret}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 border-2 border-transparent focus:border-orange-500 focus:bg-white rounded-2xl px-12 py-3.5 text-sm font-bold text-slate-800 outline-none transition-all uppercase"
                                        required
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={loading}
                                className="human-button bg-slate-900 text-white w-full flex justify-center py-4 mt-4 disabled:opacity-50"
                            >
                                {loading && <Loader2 className="animate-spin mr-2" size={18} />}
                                Save Credentials
                            </button>
                        </form>
                    </div>

                    {/* Status & Action */}
                    <div className="space-y-8 h-full">
                        
                        {/* Status Card */}
                        <div className={`soft-card p-10 border-2 transition-all duration-500 ${isConnected ? "bg-emerald-50 border-emerald-100" : "bg-orange-50 border-orange-100"}`}>
                            <div className="flex flex-col items-center text-center space-y-6">
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-500 ${isConnected ? "bg-emerald-500 shadow-emerald-100" : "bg-orange-500 shadow-orange-100 animate-pulse"}`}>
                                    {isConnected ? <CheckCircle2 className="text-white" size={40} /> : <AlertCircle className="text-white" size={40} />}
                                </div>
                                
                                <div>
                                    <h4 className={`text-2xl font-black ${isConnected ? "text-emerald-900" : "text-orange-900"}`}>
                                        {isConnected ? "Connected" : "Disconnected"}
                                    </h4>
                                    <p className={`text-sm font-medium mt-1 ${isConnected ? "text-emerald-600" : "text-orange-600"}`}>
                                        {isConnected ? "Live market link established" : "Requires active session to trade"}
                                    </p>
                                </div>

                                {!isConnected ? (
                                    <button 
                                        onClick={handleLogin}
                                        disabled={loginLoading}
                                        className="human-button bg-orange-600 text-white shadow-xl shadow-orange-100 hover:bg-orange-700 w-full flex justify-center py-5 mt-4 disabled:opacity-50"
                                    >
                                        {loginLoading ? <Loader2 className="animate-spin mr-2" size={24} /> : <LogIn size={24} className="mr-3" />}
                                        <span className="text-lg font-black tracking-tight">Login to Angel One</span>
                                    </button>
                                ) : (
                                    <button 
                                        onClick={handleLogout}
                                        className="human-button bg-white text-emerald-600 border-2 border-emerald-200 shadow-xl shadow-emerald-50 hover:bg-emerald-100 w-full flex justify-center py-5 mt-4"
                                    >
                                        <LogOut size={24} className="mr-3" />
                                        <span className="text-lg font-black tracking-tight">Logout Broker</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Security Tip */}
                        <div className="bg-blue-50/50 p-8 rounded-[2rem] border border-blue-100">
                            <h5 className="font-bold text-blue-900 flex items-center gap-2 mb-2">
                                <ShieldCheck size={16} /> Security Check
                            </h5>
                            <p className="text-xs text-blue-800 leading-relaxed font-medium">
                                We use AES-256 military-grade encryption to store your keys. Neither our team nor any third party can read your data.
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

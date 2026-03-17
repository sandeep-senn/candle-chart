import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, ShieldAlert, Key, Link as LinkIcon, 
  Settings, Loader2, CheckCircle2, AlertCircle 
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../api/api";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function BrokerSettings() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [formData, setFormData] = useState({
    apiKey: "",
    clientCode: "",
    password: "",
    totpKey: "",
  });

  const checkStatus = async () => {
    try {
      const res = await api.get("/angel/status");
      setStatus(res.data.status);
    } catch (err) {
      console.error("Status check failed", err);
    }
  };

  useEffect(() => {
    document.title = "Broker Security | Candle";
    checkStatus();
    const id = setInterval(checkStatus, 30000);
    return () => clearInterval(id);
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/angel/config", formData);
      toast.success("Security credentials updated");
      checkStatus();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update configuration");
    } finally {
      setLoading(false);
    }
  };

  const isConnected = status === "CONNECTED";

  return (
    <div className="min-h-screen pt-20 pb-12 bg-zinc-50 px-6 tracking-tight">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
               Broker Connection <Settings size={20} className="text-zinc-400" />
            </h1>
            <p className="text-zinc-500 mt-1 text-sm">Configure your SmartAPI credentials for direct terminal execution.</p>
          </div>
          
          <Badge 
            variant={isConnected ? "default" : "destructive"}
            className="px-3 py-1 text-xs font-bold shadow-sm"
          >
            {isConnected ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} /> SYSTEM CONNECTED
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <ShieldAlert size={14} /> SYSTEM DISCONNECTED
              </div>
            )}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Form */}
          <div className="lg:col-span-12">
            <Card className="border-zinc-200 shadow-xl overflow-hidden">
               <CardHeader className="bg-zinc-900 text-white p-6">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white border border-white/10">
                        <Key size={20} />
                     </div>
                     <div>
                        <CardTitle className="text-lg font-bold italic tracking-tighter">Security Protocols</CardTitle>
                        <CardDescription className="text-zinc-400 font-medium text-xs">SmartAPI Credentials & Access Control</CardDescription>
                     </div>
                  </div>
               </CardHeader>
               
               <CardContent className="p-6">
                  <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">SmartAPI Key</label>
                        <Input 
                          placeholder="Your API Key"
                          required
                          value={formData.apiKey}
                          onChange={(e) => setFormData({...formData, apiKey: e.target.value})}
                          className="h-10 text-zinc-900 font-medium"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Client Code</label>
                        <Input 
                          placeholder="Ex: S123456"
                          required
                          value={formData.clientCode}
                          onChange={(e) => setFormData({...formData, clientCode: e.target.value})}
                          className="h-10 text-zinc-900 font-medium"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Trading Password</label>
                        <Input 
                          type="password"
                          placeholder="••••••••"
                          required
                          value={formData.password}
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                          className="h-10 text-zinc-900 font-medium"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">TOTP Seed Key</label>
                        <Input 
                          placeholder="24-character alphanumeric key"
                          required
                          value={formData.totpKey}
                          onChange={(e) => setFormData({...formData, totpKey: e.target.value})}
                          className="h-10 text-zinc-900 font-medium"
                        />
                     </div>
                     <div className="md:col-span-2 pt-4">
                        <Button 
                          type="submit" 
                          disabled={loading}
                          className="w-full h-12 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl shadow-lg shadow-zinc-200"
                        >
                          {loading ? <Loader2 className="animate-spin mr-2" /> : <ShieldCheck size={18} className="mr-2" />}
                          Update Credentials
                        </Button>
                     </div>
                  </form>
               </CardContent>

               <CardFooter className="bg-zinc-50 p-6 flex items-center gap-4 text-xs font-medium text-zinc-500 border-t border-zinc-100">
                  <div className="flex items-center gap-1.5 uppercase tracking-widest text-[9px]">
                     <LinkIcon size={12} /> Direct SmartAPI Sync
                  </div>
                  <span>&bull;</span>
                  <div className="flex items-center gap-1.5 uppercase tracking-widest text-[9px]">
                     <ShieldCheck size={12} className="text-emerald-500" /> AES-256 Encrypted
                  </div>
               </CardFooter>
            </Card>
          </div>

          {/* Quick Notice Card */}
          <div className="lg:col-span-12">
            <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-4 shadow-sm">
               <AlertCircle size={20} className="text-amber-600 mt-1" />
               <div className="space-y-2">
                  <h4 className="text-sm font-bold text-amber-900 uppercase tracking-wider">Security Notice</h4>
                  <p className="text-xs font-medium text-amber-700 leading-relaxed">
                    Ensure your SmartAPI has the correct **Static IP** configured in your Angel One dashboard. 
                    Misconfiguration will result in aborted execution protocols.
                  </p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

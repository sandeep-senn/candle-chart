import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Terminal, ShieldCheck, Mail, Lock, 
  ArrowRight, Activity, TrendingUp 
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../api/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const navigate = useNavigate();

  useEffect(() => {
    document.title = isLogin ? "Login | Candle" : "Join | Candle";
  }, [isLogin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      const res = await api.post(endpoint, formData);
      localStorage.setItem("token", res.data.token);
      toast.success(isLogin ? "Welcome back!" : "Account created successfully");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Authentication failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-zinc-50 tracking-tight">
      
      {/* Visual Side */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-zinc-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-zinc-800 rounded-full -translate-y-1/2 translate-x-1/2 opacity-20 blur-3xl"></div>
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center text-zinc-900 shadow-xl">
             <Terminal size={20} />
          </div>
          <span className="text-lg font-bold tracking-tight">Candle Terminal</span>
        </div>

        <div className="relative z-10 max-w-sm">
          <Badge className="mb-4 bg-zinc-800 text-zinc-400 hover:bg-zinc-800 transition-none border-none">SYSTEM v3.14</Badge>
          <h2 className="text-4xl font-bold tracking-tighter leading-none mb-4">Trade with Precision & Speed.</h2>
          <p className="text-zinc-400 text-base leading-relaxed font-medium">The most powerful marketplace interface ever built. Connect. Execute. Analyze.</p>
          
          <div className="mt-10 flex gap-6">
             <div className="flex flex-col gap-1">
                <span className="text-2xl font-bold">40ms</span>
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Execution Speed</span>
             </div>
             <div className="flex flex-col gap-1">
                <span className="text-2xl font-bold">100%</span>
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Direct API Access</span>
             </div>
          </div>
        </div>

        <div className="relative z-10 text-[10px] font-medium text-zinc-500 flex items-center gap-4">
           <span>Terms of Intelligence</span>
           <span>&bull;</span>
           <span>Privacy Protocols</span>
           <span>&bull;</span>
           <span>System Status</span>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
           <Card className="border-zinc-200 shadow-lg overflow-hidden">
             <CardHeader className="text-center pb-6 border-b border-zinc-100 bg-white/50 space-y-1">
                <CardTitle className="text-xl font-bold text-zinc-900 tracking-tight">
                    {isLogin ? "Welcome Back" : "Create Account"}
                </CardTitle>
                <CardDescription className="text-zinc-500 font-medium italic text-xs">
                    {isLogin ? "Access your terminal to continue trading" : "Step into the future of marketplace activity"}
                </CardDescription>
             </CardHeader>
             
             <CardContent className="pt-6 space-y-5">
                <form onSubmit={handleSubmit} className="space-y-3">
                  {!isLogin && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Company Name</label>
                      <div className="relative">
                        <Activity className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={16} />
                        <Input
                          placeholder="What's your trade name?"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="pl-12 h-11 rounded-lg text-zinc-900 font-medium placeholder:text-zinc-300"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Email Protocol</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={16} />
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="pl-12 h-11 rounded-lg text-zinc-900 font-medium placeholder:text-zinc-300"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Access Key</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={16} />
                      <Input
                        type="password"
                        placeholder="••••••••"
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="pl-12 h-11 rounded-lg text-zinc-900 font-medium placeholder:text-zinc-300"
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={processing}
                    className="w-full h-12 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-base mt-4 shadow-md shadow-zinc-200"
                  >
                    {processing ? (
                      <Activity className="animate-spin mr-2" />
                    ) : (
                      <>
                        {isLogin ? "Authenticate" : "Initialize Access"}
                        <ArrowRight className="ml-2" size={16} />
                      </>
                    )}
                  </Button>
                </form>
             </CardContent>

             <CardFooter className="pb-8 flex justify-center border-t border-zinc-100 bg-zinc-50/30 py-6">
                <button 
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors"
                >
                  {isLogin ? "New user? Create an account" : "Already registered? Login here"}
                </button>
             </CardFooter>
           </Card>

           <div className="mt-8 flex justify-center items-center gap-2 px-4 py-2 bg-zinc-100 rounded-full w-fit mx-auto border border-zinc-200/50">
              <ShieldCheck className="text-zinc-400" size={14} />
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Secure Terminal Session</span>
           </div>
        </div>
      </div>
    </div>
  );
}

function Badge({ children, className }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 ${className}`}>
      {children}
    </span>
  )
}

import { useEffect } from "react";
import { ArrowRight, TrendingUp, ShieldCheck, Heart } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Hero() {
  useEffect(() => {
    document.title = "TradeScope | Professional Trading Platform";
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col items-center px-6 pt-24 overflow-hidden bg-zinc-950">
      {/* Blurred Candlestick Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img 
          src="/bg.png" 
          alt="" 
          className="w-full h-full object-cover opacity-70 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/90 via-zinc-950/40 to-zinc-950"></div>
      </div>

      <div className="flex flex-col justify-center items-center text-center max-w-7xl pt-10 z-10">
        
        <div className="mb-6 flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-[10px] font-bold uppercase tracking-widest backdrop-blur-md">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
          <span>Enterprise Grade Trading</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-black text-white leading-[1.1] tracking-tighter">
          Professional Trading for<br />the <span className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.3)]">Modern</span> Investor.
        </h1>

        <p className="mt-6 text-zinc-400 max-w-2xl text-lg md:text-xl leading-relaxed font-medium">
          Manage your portfolio with high-performance tools, real-time data integration, and institutional-grade security. Built for clarity and speed.
        </p>

        <div className="mt-12 flex flex-wrap justify-center gap-5">
          <Button asChild size="lg" className="rounded-2xl px-10 py-8 font-bold text-lg shadow-2xl shadow-emerald-900/20 transition-all bg-blue-800 hover:bg-blue-800 text-white border-0">
            <NavLink to="/panel">
              Launch Terminal <ArrowRight size={20} className="ml-2" />
            </NavLink>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-2xl bg-black px-10 py-8 font-bold text-lg transition-all border-white/10 text-white backdrop-blur-md">
            <NavLink to="/baskets">
              View Collections
            </NavLink>
          </Button>
        </div>

        {/* Feature Cards
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl pb-24">
          <Card className="border-white/5 shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-b from-white/10 to-transparent backdrop-blur-xl">
            <CardHeader className="p-8 text-left">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4 border border-emerald-500/20">
                <TrendingUp size={24} />
              </div>
              <CardTitle className="text-xl font-bold text-white">Fast Execution</CardTitle>
              <CardDescription className="text-zinc-400 text-base font-medium mt-2">Direct market access with optimized low-latency routing for every trade.</CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-white/5 shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-b from-white/10 to-transparent backdrop-blur-xl">
            <CardHeader className="p-8 text-left">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-4 border border-blue-500/20">
                <ShieldCheck size={24} />
              </div>
              <CardTitle className="text-xl font-bold text-white">Safe & Secure</CardTitle>
              <CardDescription className="text-zinc-400 text-base font-medium mt-2">Institutional-grade encryption and multi-factor authentication for total peace of mind.</CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-white/5 shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-b from-white/10 to-transparent backdrop-blur-xl">
            <CardHeader className="p-8 text-left">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 mb-4 border border-rose-500/20">
                <Heart size={24} />
              </div>
              <CardTitle className="text-xl font-bold text-white">User Focused</CardTitle>
              <CardDescription className="text-zinc-400 text-base font-medium mt-2">An interface designed by traders, for traders. Performance meets simplicity.</CardDescription>
            </CardHeader>
          </Card>
        </div> */}
      </div>
    </section>
  );
}

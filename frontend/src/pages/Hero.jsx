import { useEffect } from "react";
import { ArrowRight, TrendingUp, ShieldCheck, Heart } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Hero() {
  useEffect(() => {
    document.title = "Candle | Professional Trading Platform";
  }, []);

  return (
    <section className="relative min-h-[80vh] flex flex-col items-center px-6 pt-24 overflow-hidden bg-white">
      <div className="flex flex-col justify-center items-center text-center max-w-4xl z-10">
        
        <div className="mb-4 flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-600 text-[10px] font-semibold uppercase tracking-wider">
          <span>Enterprise Grade Trading</span>
        </div>

        <h1 className="text-3xl md:text-5xl font-bold text-zinc-900 leading-tight tracking-tight">
          Professional Trading <br className="hidden md:block" />
          for the Modern Investor.
        </h1>

        <p className="mt-4 md:mt-6 text-zinc-500 max-w-xl text-base md:text-lg leading-relaxed">
          Manage your portfolio with high-performance tools, real-time data integration, and enterprise-level security. Built for clarity and efficiency.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Button asChild size="default" className="rounded-full px-6 font-semibold">
            <NavLink to="/panel">
              Open Trading Terminal <ArrowRight size={16} className="ml-2" />
            </NavLink>
          </Button>
          <Button asChild variant="outline" size="default" className="rounded-full px-6 font-semibold">
            <NavLink to="/baskets">
              View Collections
            </NavLink>
          </Button>
        </div>

        {/* Feature Cards */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-5xl">
          <Card className="border-zinc-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="p-5">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-900 mb-2">
                <TrendingUp size={20} />
              </div>
              <CardTitle className="text-lg">Fast Execution</CardTitle>
              <CardDescription className="text-sm">Direct market access with optimized routing.</CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-zinc-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="p-5">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-900 mb-2">
                <ShieldCheck size={20} />
              </div>
              <CardTitle className="text-lg">Safe & Secure</CardTitle>
              <CardDescription className="text-sm">Military-grade encryption for your credentials.</CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-zinc-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="p-5">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-900 mb-2">
                <Heart size={20} />
              </div>
              <CardTitle className="text-lg">User Focused</CardTitle>
              <CardDescription className="text-sm">Intuitive interface designed for performance.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </section>
  );
}

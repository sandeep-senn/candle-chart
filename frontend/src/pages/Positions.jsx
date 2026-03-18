import React, { useEffect, useState, useMemo } from "react";
import { 
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, 
  Activity, Wallet, LayoutDashboard 
} from "lucide-react";
import api from "../api/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Positions() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPositions = async () => {
    try {
      const res = await api.get("/angel/positions");
      setPositions(res.data.data || []);
    } catch (err) {
      console.error("Positions error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Live Positions | Candle";
    fetchPositions();
    const interval = setInterval(fetchPositions, 5000);
    return () => clearInterval(interval);
  }, []);

  const totalPnl = useMemo(() => {
    return positions.reduce((sum, p) => sum + Number(p.pnl), 0);
  }, [positions]);

  if (loading) {
    return (
      <div className="min-h-screen pt-32 px-6 flex justify-center">
        <Activity className="animate-spin text-zinc-300" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12 bg-zinc-50 px-6">
      <div className="max-w-7xl mx-auto space-y-8 tracking-tight">
        
        {/* Header Summary */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Active Positions</h1>
            <p className="text-zinc-500 mt-1 text-sm">Real-time performance tracking of your live trades.</p>
          </div>
          
          <Card className="border-zinc-200 shadow-sm w-full md:w-auto">
            <CardContent className="p-5 flex items-center gap-5">
              <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-900">
                  <Wallet size={18} />
              </div>
              <div className="text-right">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Total Returns Today</span>
                <div className={`text-xl font-bold font-mono ${totalPnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {totalPnl >= 0 ? "+" : ""}₹{totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Grid of Positions */}
        {positions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {positions.map((p) => {
              const isProfit = Number(p.pnl) >= 0;
              return (
                <Card key={p.symbol} className="border-zinc-200 shadow-sm hover:border-zinc-300 transition-colors">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg font-bold">{p.tradingsymbol}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] py-0">{p.exchange}</Badge>
                          <Badge variant="secondary" className="text-[10px] py-0">{p.product}</Badge>
                        </CardDescription>
                      </div>
                      <Badge variant={isProfit ? "default" : "destructive"} className="px-2 py-0.5">
                        {isProfit ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                        {((Math.abs(p.pnl) / (p.quantity * (p.buyprice || 1))) * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 pb-4 border-b border-zinc-50">
                      <div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase">Quantity</span>
                        <div className="font-bold text-zinc-900">{p.quantity}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase">Avg. Price</span>
                        <div className="font-bold text-zinc-900">₹{Number(p.buyprice || 0).toFixed(2)}</div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tight">Current Returns</span>
                        <div className={`text-xl font-bold font-mono ${isProfit ? "text-emerald-600" : "text-rose-600"}`}>
                          {isProfit ? "+" : ""}₹{Number(p.pnl).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className={`p-1.5 rounded-lg ${isProfit ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                          {isProfit ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-xl border border-dashed border-zinc-200">
            <LayoutDashboard className="text-zinc-200 mb-4" size={48} />
            <span className="text-zinc-500 font-medium">No active positions found.</span>
            <Button asChild variant="link" className="mt-2" onClick={() => (window.location.href='/panel')}>
               Go to Trading Panel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

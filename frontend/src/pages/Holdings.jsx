import { useEffect, useState } from "react";
import api from "../api/api";
import { Wallet, Info, ArrowUpRight, ArrowDownRight, Briefcase, RefreshCw, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Holdings() {
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportTime, setReportTime] = useState(null);

  const fetchHoldings = async () => {
    try {
      const res = await api.get("/order/getHoldings");
      const fetchedHoldings = res.data.data || [];

      const sortedHoldings = [...fetchedHoldings].sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));
      setHoldings(sortedHoldings);
      setReportTime(new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }));
    } catch (err) {
      console.error("Holdings error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Holdings | Candle";
    fetchHoldings();
  }, []);

  const totalValue = holdings.reduce((acc, h) => acc + (h.quantity * (h.last_price || h.average_price)), 0);
  const totalPnl = holdings.reduce((acc, h) => acc + h.pnl, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading your vault...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12 bg-background text-foreground px-6 tracking-tight transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header Summary */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
               Holdings <Briefcase size={20} className="text-muted-foreground" />
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">Your long-term investment portfolio and wealth growth.</p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <Card className="border-border shadow-sm min-w-[200px] bg-card">
                <CardContent className="p-5">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Portfolio Value</span>
                    <div className="text-xl font-bold text-foreground font-mono">
                        ₹{totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                </CardContent>
            </Card>

            <Card className="border-border shadow-sm min-w-[200px] bg-card">
                <CardContent className="p-5">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Total P&L</span>
                    <div className={`text-xl font-bold font-mono ${totalPnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {totalPnl >= 0 ? "+" : ""}₹{totalPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                </CardContent>
            </Card>
          </div>
        </div>

        {reportTime && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchHoldings}
              className="rounded-full text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
            >
              <RefreshCw size={12} className={`mr-2 ${loading ? "animate-spin" : ""}`} />
              Updated: {reportTime}
            </Button>
          </div>
        )}

        {holdings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 bg-card rounded-xl border border-dashed border-border text-muted-foreground">
            <Layers size={48} className="mb-4 opacity-10" />
            <p className="font-medium text-sm">No holdings found in your account.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {holdings.map((h) => {
              const isProfit = h.pnl >= 0;
              return (
                <Card key={h.tradingsymbol} className="border-border shadow-sm hover:border-primary/20 bg-card transition-all">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg font-bold text-foreground">{h.tradingsymbol}</CardTitle>
                        <CardDescription className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-tight">{h.isin}</CardDescription>
                      </div>
                      <Badge variant={isProfit ? "default" : "destructive"} className="px-2 py-0.5">
                        {isProfit ? <ArrowUpRight size={12} className="mr-1" /> : <ArrowDownRight size={12} className="mr-1" />}
                        {((h.pnl / (h.quantity * h.average_price)) * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 pb-4 border-b border-zinc-50">
                      <div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase">Quantity</span>
                        <div className="font-bold text-zinc-900">{h.quantity}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase">Avg. Price</span>
                        <div className="font-bold text-zinc-900">₹{h.average_price.toFixed(2)}</div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">Current P&L</span>
                        <div className={`text-xl font-bold font-mono ${isProfit ? "text-emerald-600" : "text-rose-600"}`}>
                          {isProfit ? "+" : ""}₹{h.pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                      <Badge variant="secondary" className="uppercase text-[9px]">{h.exchange}</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

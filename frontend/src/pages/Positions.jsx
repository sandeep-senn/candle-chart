import { io } from "socket.io-client";
import { useEffect, useState } from "react";
import api from "../api/api";
import { AnimatePresence, motion } from "framer-motion";
import { TrendingUp, TrendingDown, Activity, Clock, ArrowUpRight, ArrowDownRight } from "lucide-react";

const socket = io("http://localhost:3000", {
  transports: ["websocket"],
});

export default function Positions() {
  const [reportTime, setReportTime] = useState(new Date().toLocaleTimeString());
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const clockId = setInterval(() => {
      setReportTime(new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }));
    }, 1000);
    return () => clearInterval(clockId);
  }, []);

  const fetchPositions = async () => {
    try {
      const res = await api.get("/order/getPositions");
      const netPositions = res.data.data?.net || [];

      const tokens = netPositions.map(p => p.instrument_token).filter(Boolean);
      if (tokens.length > 0) {
        await api.post("/subscribe", { tokens });
      }

      const sortedPositions = [...netPositions].sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));
      setPositions(sortedPositions);
    } catch (err) {
      console.error("Positions error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Live Journey | Candle";
    fetchPositions();
    const id = setInterval(fetchPositions, 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handlePriceUpdate = (data) => {
      setPositions(prev => prev.map(p => {
        if (p.instrument_token === data.instrument_token) {
          const ltp = data.ltp;
          const newPnl = (ltp - p.average_price) * p.quantity;
          return { ...p, last_price: ltp, pnl: newPnl };
        }
        return p;
      }));
    };

    socket.on("price-update", handlePriceUpdate);
    return () => socket.off("price-update", handlePriceUpdate);
  }, []);

  const totalPnl = positions.reduce((acc, p) => acc + p.pnl, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="w-full max-w-5xl p-10 bg-white/50 backdrop-blur-md rounded-[3rem] shadow-xl animate-pulse border border-orange-50">
          <div className="h-12 bg-orange-100/50 rounded-full w-1/4 mx-auto mb-16"></div>
          <div className="grid gap-8 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-56 bg-white/80 rounded-[2.5rem] border border-orange-50"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20">
      <div className="mx-auto w-full max-w-7xl px-6">

        {/* Header with Total Summary */}
        <div className="mb-16 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-left max-w-md">
            <h2 className="text-4xl font-bold text-slate-900 tracking-tight">
              Live Journey
            </h2>
            <p className="text-slate-500 mt-2 text-lg font-medium">
              Real-time update on your open positions. We're watching the markets with you.
            </p>
            <div className="flex items-center gap-2 mt-4">
              <Clock size={14} className="text-orange-400" />
              <span className="text-xs font-bold text-orange-400 uppercase tracking-widest bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
                Refreshed: {reportTime}
              </span>
            </div>
          </div>

          {positions.length > 0 && (
            <div className="soft-card p-8 bg-white flex flex-col items-center md:items-end min-w-[300px]">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Total Returns Today</span>
              <div className={`text-4xl font-black tracking-tighter ${totalPnl >= 0 ? 'text-green-600' : 'text-rose-600'}`}>
                {totalPnl >= 0 ? '+' : ''}₹{totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="flex items-center gap-1.5 mt-2 opacity-60">
                <Activity size={14} className="text-slate-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase">{positions.length} Active Trades</span>
              </div>
            </div>
          )}
        </div>

        {!loading && positions.length === 0 && (
          <div className="text-center py-20 bg-white/50 backdrop-blur-sm rounded-[3rem] border-2 border-dashed border-orange-100 flex flex-col items-center">
            <div className="w-20 h-20 bg-white shadow-xl shadow-orange-100 rounded-full flex items-center justify-center mb-6">
              <Activity size={32} className="text-orange-300" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800">Peaceful for now</h3>
            <p className="text-slate-500 mt-2">No active trades in your portfolio at the moment.</p>
          </div>
        )}

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {positions.map((p) => {
              const isProfit = p.pnl >= 0;
              return (
                <motion.div
                  key={p.tradingsymbol}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="soft-card p-8 group hover:border-orange-200 transition-all duration-500 overflow-hidden relative"
                >
                  <div className="flex justify-between items-start relative z-10">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 tracking-tight group-hover:text-orange-600 transition-colors">
                        {p.tradingsymbol}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{p.exchange}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{p.product}</span>
                      </div>
                    </div>

                    <div className={`flex items-center gap-1 px-4 py-1.5 rounded-full shadow-sm text-[10px] font-black uppercase tracking-widest ${isProfit ? "bg-green-50 text-green-600 border border-green-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                      }`}>
                      {isProfit ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {isProfit ? "Winning" : "Learning"}
                    </div>
                  </div>

                  <div className="mt-8 grid grid-cols-2 gap-8 relative z-10">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Holding</span>
                      <span className="text-xl font-bold text-slate-800">{p.quantity} <span className="text-xs font-medium text-slate-400 uppercase">Shares</span></span>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Live Price</span>
                      <span className="text-xl font-bold text-slate-800">₹{parseFloat(p.last_price || p.average_price).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="mt-8 p-6 bg-slate-50 rounded-3xl border border-slate-100 relative z-10">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Trade Returns</span>
                      <div className={isProfit ? "text-green-500" : "text-rose-500"}>
                        {isProfit ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      </div>
                    </div>
                    <div className={`text-3xl font-black tracking-tight ${isProfit ? "text-green-600" : "text-rose-600"}`}>
                      {isProfit ? '+' : ''}₹{p.pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Aesthetic Background Shapes */}
                  <div className={`absolute -right-10 -bottom-10 w-40 h-40 rounded-full blur-3xl opacity-10 transition-all duration-700 group-hover:scale-150 ${isProfit ? 'bg-green-400' : 'bg-rose-400'}`}></div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

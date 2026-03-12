import { useEffect, useState } from "react";
import api from "../api/api";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Info, ArrowUpRight, ArrowDownRight, Briefcase, RefreshCw } from "lucide-react";

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
    document.title = "Your Wealth Cabinet | Candle";
    fetchHoldings();
  }, []);

  const totalValue = holdings.reduce((acc, h) => acc + (h.quantity * (h.last_price || h.average_price)), 0);
  const totalPnl = holdings.reduce((acc, h) => acc + h.pnl, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="w-full max-w-5xl p-10 bg-white/50 backdrop-blur-md rounded-[3.5rem] shadow-xl animate-pulse border border-orange-50">
          <div className="h-10 bg-orange-100/50 rounded-full w-1/4 mx-auto mb-16"></div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-56 bg-white/80 rounded-3xl border border-orange-50"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20">
      <div className="mx-auto w-full max-w-7xl px-6">

        {/* Header - Human Style */}
        <div className="mb-16 flex flex-col md:flex-row items-end justify-between gap-12">
          <div className="text-left max-w-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-orange-500 text-white rounded-2xl shadow-lg shadow-orange-100">
                <Briefcase size={24} />
              </div>
              <h2 className="text-4xl font-bold text-slate-900 tracking-tight">Your Wealth Cabinet</h2>
            </div>
            <p className="text-slate-500 text-lg font-medium leading-relaxed">
              This is where your long-term seeds grow. We're keeping an eye on your assets while you focus on what matters.
            </p>
          </div>

          <div className="soft-card p-10 bg-white min-w-[320px] relative overflow-hidden group">
            <div className="relative z-10">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Portfolio Value</span>
              <div className="text-4xl font-black text-slate-900 tracking-tighter mb-4">
                ₹{totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm ${totalPnl >= 0 ? 'bg-green-50 text-green-600' : 'bg-rose-50 text-rose-600'}`}>
                {totalPnl >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                {totalPnl >= 0 ? '+' : ''}₹{totalPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
            <Wallet size={80} className="absolute -right-4 -bottom-4 text-slate-50 group-hover:rotate-12 transition-transform duration-700" />
          </div>
        </div>

        {reportTime && (
          <div className="flex justify-center mb-12">
            <button
              onClick={fetchHoldings}
              className="flex items-center gap-2 px-6 py-2 rounded-full bg-white border border-orange-100 text-[10px] font-bold text-orange-400 uppercase tracking-[0.2em] hover:bg-orange-50 transition-colors shadow-sm"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Refreshed: {reportTime}
            </button>
          </div>
        )}

        {!loading && holdings.length === 0 && (
          <div className="text-center py-20 bg-white/50 backdrop-blur-sm rounded-[3rem] border-2 border-dashed border-orange-100 flex flex-col items-center">
            <div className="w-20 h-20 bg-white shadow-xl shadow-orange-100 rounded-full flex items-center justify-center mb-6">
              <Briefcase size={32} className="text-orange-300" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800">Your cabinet is empty</h3>
            <p className="text-slate-500 mt-2 font-medium">Ready to start your investment journey?</p>
          </div>
        )}

        <div className="grid gap-8 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {holdings.map((h, idx) => {
              const isProfit = h.pnl >= 0;
              return (
                <motion.div
                  key={h.tradingsymbol}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="soft-card p-8 group flex flex-col justify-between hover:border-orange-200"
                >
                  <div>
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900 leading-none group-hover:text-orange-600 transition-colors">{h.tradingsymbol}</h3>
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1 block">{h.isin}</span>
                      </div>
                      <div className={`p-2 rounded-xl ${isProfit ? 'bg-green-50 text-green-500' : 'bg-rose-50 text-rose-500'}`}>
                        {isProfit ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ownership</span>
                          <span className="text-xl font-bold text-slate-800">{h.quantity} <span className="text-xs font-medium text-slate-400">Shares</span></span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entry</span>
                          <span className="text-xl font-bold text-slate-800">₹{h.average_price.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                        </div>
                      </div>

                      <div className="p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Outcome</span>
                          <div className={`text-xs font-black rounded-full px-2 py-0.5 ${isProfit ? 'bg-green-100 text-green-600' : 'bg-rose-100 text-rose-600'}`}>
                            {isProfit ? 'GROWING' : 'HOLDING'}
                          </div>
                        </div>
                        <div className={`text-3xl font-black tracking-tight ${isProfit ? 'text-green-600' : 'text-rose-600'}`}>
                          {isProfit ? '+' : ''}₹{h.pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-50 flex justify-between items-center opacity-40 hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Market: {h.exchange}</span>
                    <Info size={14} className="text-slate-400 cursor-help" />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// Sub-components used
function TrendingUp({ size, className }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg> }
function TrendingDown({ size, className }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg> }

import { useEffect, useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import api from "../api/api";
import { ShoppingBag, ChevronLeft, ChevronRight, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { NavLink } from "react-router-dom";

const ITEMS_PER_PAGE = 6;

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchOrders = async () => {
    try {
      const res = await api.get("/order/getOrders");
      const fetchedOrders = res.data.data || [];

      const sortedOrders = [...fetchedOrders].sort((a, b) => {
        return new Date(b.order_timestamp) - new Date(a.order_timestamp);
      });
      setOrders(sortedOrders);
    } catch (err) {
      console.error("Orders error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Your Activity | Candle";
    fetchOrders();
    const id = setInterval(fetchOrders, 10000);
    return () => clearInterval(id);
  }, []);

  const getUiStatus = (o) => {
    if (o.status === "COMPLETE") return o.transaction_type;
    if (o.status === "OPEN" || o.status === "TRIGGER PENDING")
      return "PENDING";
    return "REJECTED";
  };

  const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE);

  const currentOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return orders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [orders, currentPage]);

  const formatDateTime = (ts) => {
    if (!ts) return "---";
    const d = new Date(ts);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="w-full max-w-4xl p-10 bg-white/50 backdrop-blur-md rounded-[3rem] shadow-xl animate-pulse border border-orange-50">
          <div className="h-10 bg-orange-100/50 rounded-full w-1/3 mx-auto mb-12"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-white/80 rounded-3xl border border-orange-50"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20">
      <div className="mx-auto w-full max-w-7xl px-6">

        {/* Header Area */}
        <div className="mb-16 text-center max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold text-slate-900 tracking-tight">
            Your Activity
          </h2>
          <p className="text-slate-500 mt-4 text-lg font-medium">
            Here's a look at your recent trades. We've organized them so you can easily track your journey.
          </p>
        </div>

        {!loading && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 bg-white/50 backdrop-blur-sm rounded-[3rem] border-2 border-dashed border-orange-100">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl shadow-orange-100">
              <ShoppingBag className="text-orange-400" size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800">No activity yet</h3>
            <p className="text-slate-500 mt-2">Your trades will appear here once you place some orders.</p>
            <NavLink to="/panel" className="mt-8 human-button bg-slate-900 text-white">
              Start Trading Now
            </NavLink>
          </div>
        )}

        {/* Order Grid */}
        <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {currentOrders.map((o) => {
              const uiStatus = getUiStatus(o);
              const isBuy = uiStatus === "BUY";
              const isComplete = o.status === "COMPLETE";

              return (
                <motion.div
                  key={o.order_id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="soft-card p-8 flex flex-col justify-between group hover:border-orange-200 transition-all duration-500"
                >
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-2xl text-slate-900 tracking-tight">
                          {o.tradingsymbol}
                        </span>
                        <div className="flex items-center gap-1.5 text-slate-400 mt-1">
                          <Clock size={12} />
                          <span className="text-[10px] font-bold uppercase tracking-wider">
                            {formatDateTime(o.order_timestamp)}
                          </span>
                        </div>
                      </div>

                      <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm ${isBuy ? "bg-green-50 text-green-600 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"
                        }`}>
                        {uiStatus}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Quantity</span>
                        <span className="text-lg font-bold text-slate-800">{o.quantity} <span className="text-xs font-medium text-slate-400">SHARES</span></span>
                      </div>

                      <div className="flex justify-between items-end">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                          {o.order_type === "LIMIT" ? "Limit Price" : "Execution"}
                        </span>
                        <span className="text-lg font-bold text-slate-800">
                          {o.price && o.price > 0 ? `₹${o.price.toLocaleString()}` : o.order_type}
                        </span>
                      </div>

                      {isComplete && (
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mt-2">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                            <span>Filled At</span>
                            <CheckCircle2 size={12} className="text-green-500" />
                          </div>
                          <div className="text-xl font-black text-slate-900">
                            ₹{Number(o.average_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-50 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">REF: {o.order_id}</span>
                    <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${o.status === "COMPLETE" ? "text-emerald-600 bg-emerald-50" :
                      o.status === "REJECTED" ? "text-rose-600 bg-rose-50" : "text-amber-600 bg-amber-50"
                      }`}>
                      {o.status === "REJECTED" && <AlertCircle size={12} />}
                      {o.status}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Pagination - Human Style */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-8 mt-16">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-4 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-orange-50 hover:text-orange-600 transition-all disabled:opacity-30 shadow-sm"
              title="Earlier Page"
            >
              <ChevronLeft size={24} />
            </button>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Chapter</span>
              <span className="text-2xl font-black text-slate-900">{currentPage}</span>
              <span className="text-slate-300 text-xl">/</span>
              <span className="text-2xl font-black text-slate-300">{totalPages}</span>
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-4 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-orange-50 hover:text-orange-600 transition-all disabled:opacity-30 shadow-sm"
              title="Next Page"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState, useMemo } from "react";
import { 
  ShoppingBag, ChevronLeft, ChevronRight, Clock, 
  CheckCircle2, AlertCircle, TrendingUp, TrendingDown 
} from "lucide-react";
import { NavLink } from "react-router-dom";
import api from "../api/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ITEMS_PER_PAGE = 8;

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
    document.title = "Order History | Candle";
    fetchOrders();
    const id = setInterval(fetchOrders, 10000);
    return () => clearInterval(id);
  }, []);

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
      <div className="min-h-screen pt-32 px-6 flex justify-center">
        <div className="animate-pulse text-zinc-300">Loading your activity...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12 bg-zinc-50 px-6 tracking-tight">
      <div className="max-w-7xl mx-auto">

        {/* Header Area */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Order Activity</h1>
          <p className="text-zinc-500 mt-1 text-sm">Detailed history of all your market executions and pending requests.</p>
        </div>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-xl border border-dashed border-zinc-200">
            <ShoppingBag className="text-zinc-200 mb-4" size={48} />
            <h3 className="text-lg font-bold text-zinc-900">No activity yet</h3>
            <p className="text-zinc-500 mt-1 mb-6">Your trades will appear here once you place some orders.</p>
            <Button asChild>
              <NavLink to="/panel">Start Trading Now</NavLink>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
            {currentOrders.map((o) => {
              const isBuy = o.transaction_type === "BUY";
              const isComplete = o.status === "COMPLETE";
              const isRejected = o.status === "REJECTED";

              return (
                <Card key={o.order_id} className="border-zinc-200 shadow-sm transition-all hover:bg-zinc-50">
                  <CardHeader className="pb-3 px-5 pt-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base font-bold">{o.tradingsymbol}</CardTitle>
                        <div className="flex items-center gap-1 text-zinc-400 mt-1">
                          <Clock size={10} />
                          <span className="text-[9px] font-bold uppercase">{formatDateTime(o.order_timestamp)}</span>
                        </div>
                      </div>
                      <Badge variant={isBuy ? "default" : "destructive"} className="uppercase text-[8px] h-4 px-1">
                        {o.transaction_type}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 text-xs px-5">
                    <div className="flex justify-between items-center text-zinc-500">
                      <span>Quantity</span>
                      <span className="font-bold text-zinc-900">{o.quantity} SHS</span>
                    </div>

                    <div className="flex justify-between items-center text-zinc-500">
                      <span>Type</span>
                      <span className="font-bold text-zinc-900">{o.order_type}</span>
                    </div>

                    <div className="pt-2 border-t border-zinc-100 flex justify-between items-center">
                      <span className="text-[10px] font-medium text-zinc-400">Price</span>
                      <span className="font-mono font-bold text-zinc-900 text-sm">
                        ₹{Number(o.average_price || o.price || 0).toFixed(2)}
                      </span>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-2 pb-3 px-5 flex justify-between items-center opacity-80">
                    <span className="text-[8px] font-mono text-zinc-400">ID: {o.order_id?.slice(-8)}</span>
                    <div className="flex items-center gap-1.5 capitalize text-[10px] font-bold">
                       {isComplete && <CheckCircle2 size={10} className="text-emerald-500" />}
                       {isRejected && <AlertCircle size={10} className="text-rose-500" />}
                       <span className={isComplete ? "text-emerald-600" : isRejected ? "text-rose-600" : "text-amber-600"}>
                         {o.status?.toLowerCase()}
                       </span>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-12">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="rounded-full"
            >
              <ChevronLeft size={20} />
            </Button>

            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="text-zinc-400 uppercase tracking-widest text-[10px]">Page</span>
              <span className="text-zinc-900">{currentPage}</span>
              <span className="text-zinc-300">/</span>
              <span className="text-zinc-500">{totalPages}</span>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="rounded-full"
            >
              <ChevronRight size={20} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

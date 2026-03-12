import { useEffect, useState, useRef } from "react";
import { toast } from "react-toastify";
import api from "../api/api";
import { io } from "socket.io-client";
import { Search, Zap, Trash2, ArrowRightLeft, ShieldCheck, TrendingUp, TrendingDown, HelpCircle, Activity } from "lucide-react";

const socket = io("http://localhost:3000", {
  transports: ["websocket"],
});

export default function TradingPanel() {
  const [searchText, setSearchText] = useState("");
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);

  const [transactionType, setTransactionType] = useState("BUY");
  const [product, setProduct] = useState("MIS");
  const [isMarket, setIsMarket] = useState(true);
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [targetPrice, setTargetPrice] = useState("");
  const [stopLossPrice, setStopLossPrice] = useState("");

  const [margin, setMargin] = useState(null);
  const [loadingMargin, setLoadingMargin] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [livePrices, setLivePrices] = useState({});
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const debounceRef = useRef(null);

  const selectedPrice = selectedCompany
    ? livePrices[selectedCompany.token]
    : null;

  const fetchCompanies = async (text) => {
    setSearchText(text);
    if (!text) {
      setSelectedCompany(null);
      setCompanies([]);
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length < 3) return;

    debounceRef.current = setTimeout(async () => {
      try {
        setLoadingSearch(true);
        const res = await api.get(`/companies/search?q=${text}`);
        setCompanies(res.data || []);
        const tokens = (res.data || []).map((c) => c.token);
        if (tokens.length > 0) {
          await api.post("/subscribe", { tokens });
        }
      } catch (err) {
        console.log("Search Error:", err);
        setCompanies([]);
      } finally {
        setLoadingSearch(false);
      }
    }, 400);
  };

  useEffect(() => {
    setFocusedIndex(-1);
  }, [companies]);

  const selectCompany = (c) => {
    setSelectedCompany(c);
    setSearchText(c.symbol);
    setCompanies([]);
    setQuantity(1);
    setPrice("");
    setTargetPrice("");
    setStopLossPrice("");
  };

  const handleKeyDown = (e) => {
    if (companies.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % companies.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev - 1 + companies.length) % companies.length);
    } else if (e.key === "Enter") {
      if (focusedIndex >= 0 && focusedIndex < companies.length) {
        selectCompany(companies[focusedIndex]);
      }
    } else if (e.key === "Escape") {
      setCompanies([]);
    }
  };

  useEffect(() => {
    if (selectedCompany) {
      document.title = `${selectedCompany.symbol} | Candle`;
    } else {
      document.title = "Trading Desk | Candle";
    }
  }, [selectedCompany]);

  useEffect(() => {
    const handlePriceUpdate = (data) => {
      setLivePrices((prev) => ({
        ...prev,
        [data.instrument_token]: data,
      }));
    };
    socket.on("price-update", handlePriceUpdate);
    return () => socket.off("price-update", handlePriceUpdate);
  }, []);

  useEffect(() => {
    if (selectedCompany && selectedPrice && isMarket) {
      const ltp = selectedPrice.ltp;
      if (transactionType === "BUY") {
        if (!targetPrice) setTargetPrice((ltp * 1.02).toFixed(2));
        if (!stopLossPrice) setStopLossPrice((ltp * 0.99).toFixed(2));
      } else {
        if (!targetPrice) setTargetPrice((ltp * 0.98).toFixed(2));
        if (!stopLossPrice) setStopLossPrice((ltp * 1.01).toFixed(2));
      }
    }
  }, [selectedCompany, transactionType, isMarket]);

  useEffect(() => {
    if (!selectedCompany) return;
    const shouldCalculate = selectedCompany && transactionType && product && quantity && (isMarket || price);
    if (!shouldCalculate) {
      setMargin(null);
      return;
    }
    const calculateMargin = async () => {
      setLoadingMargin(true);
      try {
        const res = await api.post("/margin", {
          exchange: selectedCompany.exchange,
          symbol: selectedCompany.symbol,
          transactionType,
          product,
          orderType: isMarket ? "MARKET" : "LIMIT",
          quantity: Number(quantity),
          price: isMarket ? undefined : Number(price),
        });
        setMargin(res.data);
      } catch (err) {
        setMargin(null);
      } finally {
        setLoadingMargin(false);
      }
    };
    calculateMargin();
  }, [selectedCompany, transactionType, product, isMarket, quantity, price]);

  const placeSmartOrder = async () => {
    if (!selectedCompany) return;
    setPlacingOrder(true);
    try {
      const res = await api.post("/order", {
        exchange: selectedCompany.exchange,
        symbol: selectedCompany.symbol,
        transactionType,
        product,
        orderType: isMarket ? "MARKET" : "LIMIT",
        quantity: Number(quantity),
        price: isMarket ? undefined : Number(price),
        targetPrice: targetPrice ? Number(targetPrice) : undefined,
        stopLossPrice: stopLossPrice ? Number(stopLossPrice) : undefined,
        isSmartOrder: true
      });
      toast.success(`Trade successfully placed!\nOrder ID: ${res.data.orderId}`);
      resetForm();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message;
      toast.error(`Couldn't place trade: ${errorMsg}`);
    } finally {
      setPlacingOrder(false);
    }
  };

  const resetForm = () => {
    setSearchText("");
    setCompanies([]);
    setSelectedCompany(null);
    setPrice("");
    setTargetPrice("");
    setStopLossPrice("");
    setMargin(null);
  };

  const ltp = selectedPrice?.ltp || 0;
  const close = selectedPrice?.ohlc?.close || 0;
  const change = +(ltp - close).toFixed(2);
  const changePercent = close ? +((change / close) * 100).toFixed(2) : 0;
  const isPositive = change >= 0;

  return (
    <div className="flex flex-col justify-center items-center min-h-[calc(100vh-80px)] p-6 pt-32">

      {/* Search Bar - Global Style */}
      <div className="w-full max-w-2xl mb-12 relative z-[60]">
        <div className="relative group">
          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
            <Search className="text-slate-400 group-focus-within:text-orange-500 transition-colors" size={24} />
          </div>
          <input
            value={searchText}
            onChange={(e) => fetchCompanies(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            placeholder="Which asset should we explore today?"
            className="w-full bg-white/80 backdrop-blur-md border-2 border-orange-50 px-16 py-6 rounded-[2.5rem] outline-none focus:ring-4 focus:ring-orange-100 shadow-xl shadow-orange-100/50 text-xl font-bold text-slate-800 placeholder:text-slate-300 transition-all uppercase"
          />
          {loadingSearch && (
            <div className="absolute inset-y-0 right-8 flex items-center">
              <Activity className="text-orange-400 animate-pulse" size={20} />
            </div>
          )}
        </div>

        {companies.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-4 bg-white/95 backdrop-blur-xl border border-orange-100 rounded-[2.5rem] shadow-2xl max-h-[400px] overflow-y-auto no-scrollbar z-[70] p-4">
            {companies.map((c, index) => {
              const isFocused = index === focusedIndex;
              return (
                <div
                  key={c.token}
                  onClick={() => selectCompany(c)}
                  onMouseEnter={() => setFocusedIndex(index)}
                  className={`flex justify-between items-center px-8 py-5 cursor-pointer rounded-3xl transition-all duration-300 ${isFocused ? "bg-orange-500 text-white shadow-lg shadow-orange-200" : "hover:bg-orange-50 text-slate-700"}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${isFocused ? "bg-white/20" : "bg-orange-100/30"}`}>
                      <Zap size={18} />
                    </div>
                    <div>
                      <div className="font-black text-lg tracking-tight">{c.symbol}</div>
                      <div className={`text-[10px] font-bold uppercase tracking-widest ${isFocused ? "text-orange-100" : "text-slate-400"}`}>{c.exchange} • {c.instrument_type}</div>
                    </div>
                  </div>
                  <div className="font-black text-xl">
                    {livePrices[c.token]?.ltp ? `₹${livePrices[c.token].ltp.toLocaleString()}` : "---"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="w-full max-w-2xl">
        {selectedCompany ? (
          <div className="soft-card p-10 space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-500">

            {/* Asset Header */}
            <div className="flex justify-between items-end pb-8 border-b border-orange-50">
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{selectedCompany.symbol}</h2>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em]">{selectedCompany.exchange} TRADING DESK</span>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-slate-900 tracking-tighter">₹{ltp.toLocaleString()}</div>
                <div className={`flex items-center justify-end gap-1 font-bold text-sm ${isPositive ? "text-green-500" : "text-rose-500"}`}>
                  {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  {isPositive ? "+" : ""}{change.toFixed(2)} ({changePercent}%)
                </div>
              </div>
            </div>

            {/* Action Selector */}
            <div className="grid grid-cols-2 p-2 bg-slate-100/50 rounded-[2rem]">
              {["BUY", "SELL"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTransactionType(t)}
                  className={`py-4 rounded-[1.5rem] text-sm font-black tracking-widest transition-all duration-500 ${transactionType === t
                    ? t === "BUY" ? "bg-green-500 text-white shadow-xl shadow-green-100" : "bg-rose-500 text-white shadow-xl shadow-rose-100"
                    : "text-slate-400 hover:text-slate-600"
                    }`}
                >
                  {t} {transactionType === t && "ACTIVE"}
                </button>
              ))}
            </div>

            {/* Trade Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 flex items-center gap-1.5">
                    Type of Trade <HelpCircle size={10} />
                  </label>
                  <div className="flex bg-slate-100/50 p-1.5 rounded-2xl">
                    {["MIS", "CNC"].map((p) => (
                      <button
                        key={p}
                        onClick={() => setProduct(p)}
                        className={`flex-1 py-3 rounded-xl text-xs font-black tracking-widest transition-all ${product === p ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"}`}
                      >
                        {p === "MIS" ? "INTRADAY" : "LONGTERM"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">How many shares?</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-orange-500 focus:bg-white rounded-3xl px-8 py-4 text-xl font-bold text-slate-800 outline-none transition-all"
                    min="1"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Entry Control</label>
                  <button
                    onClick={() => setIsMarket(!isMarket)}
                    className={`w-full py-4 rounded-2xl text-xs font-black tracking-widest border-2 transition-all ${isMarket ? "bg-orange-50 border-orange-200 text-orange-600" : "bg-white border-slate-200 text-slate-600"}`}
                  >
                    {isMarket ? "FAST MARKET" : "SPECIFIC PRICE"}
                  </button>
                </div>

                {!isMarket && (
                  <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Your Price Target</label>
                    <div className="relative">
                      <span className="absolute left-6 top-4 text-slate-300 font-bold">₹</span>
                      <input
                        type="number"
                        step="0.05"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-orange-500 focus:bg-white rounded-3xl pl-12 pr-8 py-4 text-xl font-bold text-slate-800 outline-none transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Smart Exit Controls */}
            <div className="p-8 bg-orange-50/30 rounded-[2.5rem] border-2 border-orange-100/50 space-y-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-500 p-2 rounded-xl shadow-lg shadow-orange-100">
                    <ShieldCheck className="text-white" size={18} />
                  </div>
                  <h3 className="font-black text-slate-800 tracking-tight">Safeguard Strategy</h3>
                </div>
                <span className="text-[8px] font-black text-orange-500 border border-orange-200 px-2 py-0.5 rounded-full bg-white tracking-widest">OCO ACTIVE</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-green-600 uppercase tracking-widest ml-2">Goal (Target)</label>
                  <div className="relative">
                    <span className="absolute left-6 top-4 text-green-300 font-bold">₹</span>
                    <input
                      type="number"
                      step="0.05"
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(e.target.value)}
                      className="w-full bg-white border-2 border-green-50 focus:border-green-500 rounded-[1.5rem] pl-12 pr-6 py-3 text-lg font-black text-slate-800 outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-rose-600 uppercase tracking-widest ml-2">Safety (Stop-Loss)</label>
                  <div className="relative">
                    <span className="absolute left-6 top-4 text-rose-300 font-bold">₹</span>
                    <input
                      type="number"
                      step="0.05"
                      value={stopLossPrice}
                      onChange={(e) => setStopLossPrice(e.target.value)}
                      className="w-full bg-white border-2 border-rose-50 focus:border-rose-500 rounded-[1.5rem] pl-12 pr-6 py-3 text-lg font-black text-slate-800 outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 text-center font-medium px-8 leading-relaxed">
                Set your goals and safety net. When either is reached, the other will be cancelled automatically, leaving you with peace of mind.
              </p>
            </div>

            {/* Margin & Executive Area */}
            <div className="pt-6 border-t border-orange-50 flex flex-col md:flex-row items-center gap-8">
              <div className={`flex-1 w-full p-6 rounded-[2rem] transition-all duration-700 ${!margin ? "bg-slate-50/50 grayscale" : margin.allowed ? "bg-emerald-50/50" : "bg-rose-50/50"}`}>
                {loadingMargin ? (
                  <div className="flex items-center justify-center gap-3 py-2">
                    <Activity className="text-slate-400 animate-spin" size={16} />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Studying Capital...</span>
                  </div>
                ) : margin ? (
                  <div className="flex justify-between items-center px-4">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Required Investment</span>
                      <div className={`text-2xl font-black ${margin.allowed ? "text-emerald-600" : "text-rose-600"}`}>
                        ₹{Number(margin.requiredMargin).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right border-l-2 border-white/50 pl-8">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Your Balance</span>
                      <div className="text-xl font-bold text-slate-800 tracking-tight">₹{Number(margin.availableMargin).toLocaleString()}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest py-2">Complete trade details to see fees</div>
                )}
              </div>

              <div className="flex items-center gap-4 w-full md:w-auto">
                <button
                  onClick={resetForm}
                  className="p-6 rounded-3xl bg-white border-2 border-slate-100 text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-100 transition-all active:scale-95 group"
                  title="Start Over"
                >
                  <Trash2 size={24} className="group-hover:rotate-12 transition-transform" />
                </button>
                <button
                  onClick={placeSmartOrder}
                  disabled={!margin?.allowed || placingOrder}
                  className={`human-button flex-1 md:flex-none md:min-w-[240px] py-6 px-10 text-xl font-black tracking-tighter shadow-2xl transition-all ${!margin?.allowed || placingOrder
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                    : "bg-orange-600 text-white hover:bg-orange-700 shadow-orange-100 hover:shadow-orange-200"
                    }`}
                >
                  {placingOrder ? "Sending..." : "Place Smart Trade"}
                  <ArrowRightLeft size={20} className="ml-2" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 space-y-8 animate-in fade-in slide-in-from-top-4 duration-1000">
            <div className="relative">
              <div className="w-32 h-32 bg-white rounded-[3rem] shadow-2xl shadow-orange-100 flex items-center justify-center">
                <Activity className="text-orange-500 animate-float" size={48} />
              </div>
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-orange-100/50 blur-xl animate-pulse rounded-full"></div>
            </div>
            <div className="text-center max-w-sm">
              <h3 className="text-2xl font-bold text-slate-800">Your Trade Desk is Ready</h3>
              <p className="text-slate-400 mt-2 font-medium">Search for any asset above to start your journey with clarity and focus.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
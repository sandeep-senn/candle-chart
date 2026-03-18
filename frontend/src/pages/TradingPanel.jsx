import React, { useState, useEffect, useCallback } from "react";
import { io } from "socket.io-client";
import { SOCKET_URL } from "../config";
import { 
    Search, Rocket, RotateCcw, TrendingUp, 
    Activity, ShieldCheck 
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../api/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
    Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function TradingPanel() {
    const [searchTerm, setSearchTerm] = useState("");
    const [results, setResults] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [orderType, setOrderType] = useState("MARKET"); // MARKET, LIMIT
    const [product, setProduct] = useState("INTRADAY"); // INTRADAY, DELIVERY, CARRYFORWARD
    const [transactionType, setTransactionType] = useState("BUY"); // BUY, SELL
    const [limitPrice, setLimitPrice] = useState("");
    const [targetPrice, setTargetPrice] = useState("");
    const [stopLossPrice, setStopLossPrice] = useState("");
    const [livePrice, setLivePrice] = useState(null);
    const [margin, setMargin] = useState(null);
    const [loadingMargin, setLoadingMargin] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);

    useEffect(() => {
        document.title = "Trading Terminal | Candle";
        
        const userId = localStorage.getItem("userId");
        const socket = io(SOCKET_URL, {
            query: { userId }
        });
        
        socket.on("price-update", (data) => {
            // Match by token for 100% accuracy (symbols like RELIANCE vs RELIANCE-EQ can cause mismatches)
            if (selectedCompany && data.instrument_token === selectedCompany.token) {
                setLivePrice(data.ltp);
            }
        });

        return () => socket.disconnect();
    }, [selectedCompany]);

    const handleSearch = async (val) => {
        setSearchTerm(val);
        if (val.length < 2) {
            setResults([]);
            return;
        }
        try {
            const res = await api.get(`/angel/search?query=${val}`);
            setResults(res.data.data || []);
        } catch (err) {
            console.error("Search error", err);
        }
    };

    const fetchMargin = useCallback(async () => {
        if (!selectedCompany || !quantity) return;
        setLoadingMargin(true);
        try {
            const res = await api.post("/angel/margin", {
                symbol: selectedCompany.symbol,
                exchange: selectedCompany.exchange,
                quantity: parseInt(quantity),
                price: orderType === "LIMIT" ? parseFloat(limitPrice) : (livePrice || 0),
                transactionType: transactionType,
                product: product,
                orderType: orderType,
                token: selectedCompany.token
            });
            setMargin(res.data);
        } catch (err) {
            console.error("Margin error", err);
        } finally {
            setLoadingMargin(false);
        }
    }, [selectedCompany, quantity, orderType, limitPrice, livePrice, transactionType, product]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (selectedCompany) fetchMargin();
        }, 500);
        return () => clearTimeout(timer);
    }, [selectedCompany, quantity, fetchMargin]);

    const handleExecute = async () => {
        if (!selectedCompany) return toast.error("Please select a company");
        if (orderType === "LIMIT" && !limitPrice) return toast.error("Please enter a limit price");
        
        setIsExecuting(true);
        try {
            await api.post("/angel/placeOrder", {
                exchange: selectedCompany.exchange,
                symbol: selectedCompany.symbol,
                token: selectedCompany.token,
                transactionType: transactionType,
                product: product,
                orderType: orderType,
                quantity: quantity,
                price: orderType === "LIMIT" ? limitPrice : "0",
                target: targetPrice,
                sl: stopLossPrice
            });
            toast.success(`${transactionType} Order placed successfully`);
            handleReset();
        } catch (err) {
            toast.error(err.response?.data?.message || "Execution failed");
        } finally {
            setIsExecuting(false);
        }
    };

    const handleReset = () => {
        setSelectedCompany(null);
        setSearchTerm("");
        setResults([]);
        setQuantity(1);
        setLimitPrice("");
        setTargetPrice("");
        setStopLossPrice("");
        setMargin(null);
        setLivePrice(null);
    };

    return (
        <div className="min-h-screen pt-20 pb-12 bg-zinc-50 px-6">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Search & Discovery */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="border-zinc-200">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold">Market Search</CardTitle>
                            <CardDescription>Find instruments to trade across exchanges.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                                <Input
                                    value={searchTerm}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    placeholder="Search Ticker..."
                                    className="pl-10"
                                />
                            </div>

                            <div className="mt-4 space-y-1 max-h-[400px] overflow-y-auto pr-2">
                                {results.map((item) => (
                                    <button
                                        key={item.symbol}
                                        onClick={() => {
                                            setSelectedCompany(item);
                                            setLivePrice(null);
                                            setResults([]);
                                            setSearchTerm(item.symbol);
                                            // Subscribe via API
                                            api.post("/subscribe", { tokens: [item.token], exchangeType: item.exchange === "NSE" ? 1 : 3 });
                                        }}
                                        className={`w-full text-left p-3 rounded-md transition-colors ${
                                            selectedCompany?.symbol === item.symbol 
                                            ? "bg-zinc-900 text-white" 
                                            : "hover:bg-zinc-100 text-zinc-700 font-medium"
                                        }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-sm">{item.symbol}</span>
                                            <Badge variant="outline" className="text-[10px] uppercase">{item.exchange}</Badge>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Execution Terminal */}
                <div className="lg:col-span-8">
                    <Card className="border-zinc-200 h-full flex flex-col shadow-sm">
                        <CardHeader className="border-b border-zinc-100 pb-5">
                            <div className="flex flex-wrap justify-between items-start gap-4">
                                <div className="min-w-fit">
                                    <CardTitle className="text-xl font-bold tracking-tight">
                                        {selectedCompany ? selectedCompany.symbol : "Terminal Ready"}
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        {selectedCompany ? selectedCompany.exchange : "Select an instrument to start trading"}
                                    </CardDescription>
                                </div>
                                {selectedCompany && (
                                    <div className="flex flex-col items-end gap-2 ml-auto">
                                        <div className="flex gap-1">
                                            <Button 
                                                variant={transactionType === "BUY" ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setTransactionType("BUY")}
                                                className={`h-7 px-3 text-[10px] font-bold ${transactionType === "BUY" ? "bg-emerald-600 hover:bg-emerald-700" : "text-emerald-600 border-emerald-100 hover:bg-emerald-50"}`}
                                            >
                                                BUY
                                            </Button>
                                            <Button 
                                                variant={transactionType === "SELL" ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setTransactionType("SELL")}
                                                className={`h-7 px-3 text-[10px] font-bold ${transactionType === "SELL" ? "bg-rose-600 hover:bg-rose-700" : "text-rose-600 border-rose-100 hover:bg-rose-50"}`}
                                            >
                                                SELL
                                            </Button>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-2xl font-mono font-bold transition-colors ${livePrice ? 'text-emerald-600 animate-pulse' : 'text-zinc-400'}`}>
                                                ₹{livePrice ? livePrice.toFixed(2) : "Fetching..."}
                                            </div>
                                            <Badge variant="secondary" className="mt-1 text-[9px] bg-emerald-100 text-emerald-700">REAL-TIME Ticker</Badge>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardHeader>

                        <CardContent className="flex-1 py-4 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Trading Quantity</label>
                                    <div className="flex flex-col gap-3">
                                        <Input
                                            type="number"
                                            min="1"
                                            value={quantity}
                                            onChange={(e) => setQuantity(e.target.value)}
                                            className="text-base h-10 w-full"
                                        />
                                        <div className="flex gap-1 flex-wrap">
                                            {[1, 5, 10, 50, 100].map(val => (
                                                <Button 
                                                    key={val} 
                                                    variant={quantity == val ? "default" : "outline"} 
                                                    size="sm"
                                                    onClick={() => setQuantity(val)}
                                                    className="h-7 text-[10px] px-2"
                                                >
                                                    {val}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Order Type</label>
                                    <div className="flex gap-4">
                                        {["MARKET", "LIMIT"].map(type => (
                                            <Button
                                                key={type}
                                                variant={orderType === type ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setOrderType(type)}
                                                className="flex-1 h-10 text-xs font-medium"
                                            >
                                                {type}
                                            </Button>
                                        ))}
                                    </div>
                                    {orderType === "LIMIT" && (
                                        <Input 
                                            type="number" 
                                            placeholder="Limit Price" 
                                            value={limitPrice}
                                            onChange={(e) => setLimitPrice(e.target.value)}
                                            className="h-10 text-sm font-bold border-zinc-300"
                                        />
                                    )}
                                </div>

                                <div className="space-y-3"> 
                                    <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Product</label>
                                    <div className="flex flex-wrap gap-2">
                                        {["INTRADAY", "DELIVERY"].map(p => (
                                            <Button
                                                key={p}
                                                variant={product === p ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setProduct(p)}
                                                className="flex-1 min-w-[100px] h-10 text-xs font-medium px-1"
                                            >
                                                {p}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Risk Management */}
                            <div className="bg-black rounded-xl p-6 text-white relative overflow-hidden">
                                <div className="flex items-center gap-2 mb-4">
                                    <ShieldCheck size={16} className="text-zinc-400" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Risk Management</span>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-medium text-emerald-400 uppercase tracking-tight">Profit Target (₹)</label>
                                        <Input
                                            type="number"
                                            step="0.05"
                                            value={targetPrice}
                                            onChange={(e) => setTargetPrice(e.target.value)}
                                            className="bg-white/5 border-white/10 text-emerald-400 placeholder:text-zinc-600 h-10"
                                            placeholder="Exit above..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-medium text-rose-400 uppercase tracking-tight">Stop Loss (₹)</label>
                                        <Input
                                            type="number"
                                            step="0.05"
                                            value={stopLossPrice}
                                            onChange={(e) => setStopLossPrice(e.target.value)}
                                            className="bg-white/5 border-white/10 text-rose-400 placeholder:text-zinc-600 h-10"
                                            placeholder="Exit below..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>

                        <CardFooter className="border-t border-zinc-100 py-6 bg-zinc-50/50 flex flex-col sm:flex-row gap-6 items-center justify-between">
                            <div className="flex flex-wrap items-center gap-4 sm:gap-8 justify-center sm:justify-start">
                                <div>
                                    <span className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Estimated Cost</span>
                                    <div className="text-lg font-bold text-zinc-900">
                                        {loadingMargin ? "..." : `₹${margin?.requiredMargin?.toLocaleString() || "0"}`}
                                    </div>
                                </div>
                                <div className="h-8 w-px bg-zinc-200 hidden sm:block"></div>
                                <div>
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Margin Status</span>
                                    <Badge variant={margin?.allowed ? "default" : "destructive"}>
                                        {margin?.allowed ? "Funds Available" : "Check Balance"}
                                    </Badge>
                                </div>
                            </div>

                            <div className="flex gap-3 w-full sm:w-auto">
                                <Button 
                                    variant="outline" 
                                    onClick={handleReset}
                                    className="flex-1 sm:flex-none"
                                >
                                    <RotateCcw size={18} className="mr-2" /> Reset
                                </Button>
                                <Button 
                                    onClick={handleExecute}
                                    disabled={!selectedCompany || isExecuting}
                                    className="flex-1 sm:min-w-[160px] font-bold"
                                >
                                    {isExecuting ? <Activity className="animate-spin mr-2" /> : <Rocket className="mr-2" />}
                                    {transactionType == "BUY" ? "Place Buy Order" : "Place Sell Order"}
                                </Button>
                            </div>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}
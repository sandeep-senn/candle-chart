import { useState, useEffect, useRef } from "react";
import { toast } from 'react-toastify';
import api from "../api/api";
import { 
    Plus, Trash2, Play, Search, X, 
    Calculator, Pencil, ShoppingCart, 
    ArrowRight, Activity, Trash
} from "lucide-react";
import ConfirmDialog from "../components/ConfirmDialog";
import { io } from "socket.io-client";
import { SOCKET_URL } from "../config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const socket = io(SOCKET_URL, {
    transports: ["websocket"],
});

export default function BasketOrders() {
    const [baskets, setBaskets] = useState([]);
    const [selectedBasket, setSelectedBasket] = useState(null);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newBasketName, setNewBasketName] = useState("");
    const [totalMargin, setTotalMargin] = useState(0);
    const [calculatingMargin, setCalculatingMargin] = useState(false);
    const [livePrices, setLivePrices] = useState({});
    const [selectedToken, setSelectedToken] = useState(null);
    const [editingOrder, setEditingOrder] = useState(null);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const [confirmConfig, setConfirmConfig] = useState({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => { },
        isDestructive: false,
        confirmText: "Confirm"
    });

    const [form, setForm] = useState({
        exchange: "NSE",
        tradingsymbol: "",
        transaction_type: "BUY",
        order_type: "MARKET",
        product: "MIS",
        quantity: 1,
        price: 0,
        stoploss_price: 0,
        target_price: 0
    });

    const searchRef = useRef(null);

    useEffect(() => {
        document.title = "Baskets | Candle";
        fetchBaskets();
    }, []);

    useEffect(() => {
        if (selectedBasket) {
            fetchOrders(selectedBasket.id);
        }
    }, [selectedBasket]);

    useEffect(() => {
        const handlePrice = (data) => {
            setLivePrices(prev => ({
                ...prev,
                [data.instrument_token]: data
            }));
        };
        socket.on("price-update", handlePrice);
        return () => socket.off("price-update", handlePrice);
    }, []);

    useEffect(() => {
        if (!selectedBasket || orders.length === 0) {
            setTotalMargin(0);
            return;
        }

        const calculateTotalMargin = async () => {
            setCalculatingMargin(true);
            try {
                const res = await api.get(`/baskets/${selectedBasket.id}/margin`);
                setTotalMargin(res.data.requiredMargin);
            } catch (err) {
                console.error("Margin calculation error", err);
            } finally {
                setCalculatingMargin(false);
            }
        };

        const timer = setTimeout(calculateTotalMargin, 500);
        return () => clearTimeout(timer);
    }, [orders, selectedBasket]);

    const fetchBaskets = async () => {
        try {
            const res = await api.get("/baskets");
            setBaskets(res.data);
        } catch (err) {
            console.error("Failed to fetch baskets", err);
        }
    };

    const fetchOrders = async (basketId) => {
        setLoading(true);
        try {
            const res = await api.get(`/baskets/${basketId}/orders`);
            setOrders(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const createBasket = async () => {
        if (!newBasketName.trim()) return;
        try {
            const res = await api.post("/baskets", { name: newBasketName });
            setBaskets([res.data, ...baskets]);
            setNewBasketName("");
            setShowAddModal(false);
            setSelectedBasket(res.data);
            toast.success("Collection created");
        } catch (err) {
            toast.error("Failed to create collection");
        }
    };

    const deleteBasket = (id, e) => {
        e.stopPropagation();
        setConfirmConfig({
            isOpen: true,
            title: "Delete Collection",
            message: "Are you sure you want to delete this collections? This action cannot be undone.",
            isDestructive: true,
            confirmText: "Delete",
            onConfirm: async () => {
                try {
                    await api.delete(`/baskets/${id}`);
                    setBaskets(prev => prev.filter(b => b.id !== id));
                    if (selectedBasket?.id === id) setSelectedBasket(null);
                    toast.success("Collection deleted");
                } catch (err) {
                    toast.error("Deletion failed");
                }
            }
        });
    };

    const searchSymbols = async (text) => {
        setSearchQuery(text);
        if (text.length < 3) {
            setSearchResults([]);
            return;
        }
        try {
            const res = await api.get(`/angel/search?query=${text}`);
            setSearchResults(res.data.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const selectSymbol = (company) => {
        setForm({
            ...form,
            exchange: company.exchange,
            tradingsymbol: company.symbol,
        });
        setSearchQuery(company.symbol);
        setSelectedToken(company.token);
        setSearchResults([]);
    };

    const addToBasket = async () => {
        if (!selectedBasket || !form.tradingsymbol) return toast.warn("Select symbol first");
        try {
            const res = await api.post(`/baskets/${selectedBasket.id}/orders`, form);
            setOrders([...orders, res.data]);
            toast.success("Order added to basket");
            cancelEdit();
        } catch (err) {
            toast.error("Failed to add order");
        }
    };

    const removeOrder = async (orderId) => {
        try {
            await api.delete(`/baskets/orders/${orderId}`);
            setOrders(orders.filter(o => o.id !== orderId));
            toast.info("Order removed");
        } catch (err) {
            toast.error("Failed to remove order");
        }
    };

    const editOrder = (order) => {
        setEditingOrder(order);
        setForm({
            exchange: order.exchange,
            tradingsymbol: order.tradingsymbol,
            transaction_type: order.transaction_type,
            order_type: order.order_type,
            product: order.product,
            quantity: order.quantity,
            price: order.price,
            stoploss_price: order.stoploss_price || 0,
            target_price: order.target_price || 0
        });
        setSearchQuery(order.tradingsymbol);
    };

    const cancelEdit = () => {
        setEditingOrder(null);
        setForm({
            exchange: "NSE",
            tradingsymbol: "",
            transaction_type: "BUY",
            order_type: "MARKET",
            product: "MIS",
            quantity: 1,
            price: 0,
            stoploss_price: 0,
            target_price: 0
        });
        setSearchQuery("");
        setSearchResults([]);
    };

    const updateOrder = async () => {
        if (!editingOrder) return;
        try {
            const res = await api.put(`/baskets/orders/${editingOrder.id}`, form);
            setOrders(orders.map(o => o.id === editingOrder.id ? res.data : o));
            toast.success("Order updated");
            cancelEdit();
        } catch (err) {
            toast.error("Update failed");
        }
    };

    const executeBasket = () => {
        if (!orders.length) return;
        setConfirmConfig({
            isOpen: true,
            title: "Bulk Execution",
            message: `Execute ${orders.length} orders in "${selectedBasket.name}"?`,
            confirmText: "Execute All",
            onConfirm: async () => {
                setExecuting(true);
                try {
                    await api.post(`/baskets/${selectedBasket.id}/execute`);
                    toast.success("Execution command sent");
                } catch (err) {
                    toast.error("Execution failed");
                } finally {
                    setExecuting(false);
                }
            }
        });
    };

    return (
        <div className="flex h-screen bg-background text-foreground pt-16 px-6 pb-6 gap-6 tracking-tight transition-colors duration-300">
            {/* Sidebar: Collections */}
            <div className="w-72 flex flex-col gap-4">
                <Card className="flex flex-col flex-1 border-border bg-card overflow-hidden shadow-sm">
                    <CardHeader className="p-4 border-b border-border flex items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Collections</CardTitle>
                        <Button 
                            size="icon" 
                            variant="outline" 
                            className="h-7 w-7 rounded-full"
                            onClick={() => setShowAddModal(!showAddModal)}
                        >
                            <Plus size={14} />
                        </Button>
                    </CardHeader>
                    
                    <CardContent className="p-1.5 overflow-y-auto space-y-1">
                        {showAddModal && (
                            <div className="p-3 bg-secondary/50 rounded-lg space-y-2 mb-2 animate-in fade-in zoom-in-95">
                                <Input 
                                    autoFocus
                                    placeholder="Name..."
                                    value={newBasketName}
                                    onChange={e => setNewBasketName(e.target.value)}
                                    className="h-9 text-sm"
                                    onKeyDown={e => e.key === 'Enter' && createBasket()}
                                />
                                <div className="flex gap-2 justify-end">
                                    <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>Cancel</Button>
                                    <Button size="sm" onClick={createBasket}>Create</Button>
                                </div>
                            </div>
                        )}

                        {baskets.map(basket => (
                            <div
                                key={basket.id}
                                onClick={() => setSelectedBasket(basket)}
                                className={`p-3 rounded-lg cursor-pointer flex justify-between items-center transition-all ${
                                    selectedBasket?.id === basket.id
                                    ? "bg-primary text-primary-foreground shadow-md font-bold"
                                    : "hover:bg-accent text-muted-foreground font-medium"
                                }`}
                            >   
                                <span className="truncate text-xs font-bold">{basket.name}</span>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className={`h-6 w-6 ${selectedBasket?.id === basket.id ? "hover:bg-primary-foreground/10 hover:text-primary-foreground" : "text-muted-foreground/40 hover:text-rose-500"}`}
                                    onClick={(e) => deleteBasket(basket.id, e)}
                                >
                                    <Trash size={12} />
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* Main Area: Basket Details */}
            <div className="flex-1">
                {selectedBasket ? (
                    <Card className="h-full flex flex-col border-border bg-card shadow-sm overflow-hidden">
                        <CardHeader className="p-6 border-b border-border flex justify-between space-y-0">
                            <div>
                                <CardTitle className="text-2xl font-bold tracking-tight">{selectedBasket.name}</CardTitle>
                                <CardDescription className="font-medium mt-1 text-xs">
                                    {orders.length} orders configured in this collection
                                </CardDescription>
                            </div>
                            <div className="text-right flex gap-10 space-y-3">
                                <div className="flex flex-col items-start">
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Required Funds</span>
                                    <div className="text-xl font-bold text-foreground font-mono">
                                        {calculatingMargin ? "..." : `₹${totalMargin.toLocaleString()}`}
                                    </div>
                                </div>
                                <Button 
                                    disabled={executing || orders.length === 0}
                                    onClick={executeBasket}
                                    size="sm"
                                    className="min-w-[160px] h-10 font-bold rounded-lg"
                                >
                                    {executing ? <Activity className="animate-spin mr-2" /> : <Play size={16} fill="currentColor" className="mr-2" />}
                                    Execute orders
                                </Button>
                            </div>
                        </CardHeader>

                        <CardContent className="p-6 flex-1 overflow-y-auto space-y-6">
                            {/* Order Input Area */}
                            <div className="bg-secondary/20 p-5 rounded-xl border border-border flex flex-wrap gap-3 items-end">
                                <div className="flex-1 min-w-[180px] space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Symbol Search</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                                        <Input 
                                            placeholder="Search Apple, NIFTY..."
                                            value={searchQuery}
                                            onChange={e => searchSymbols(e.target.value.toUpperCase())}
                                            className="pl-9 h-10 font-bold text-xs bg-background"
                                        />
                                        {searchResults.length > 0 && (
                                            <Card className="absolute top-full left-0 right-0 mt-2 z-50 border-border bg-card shadow-xl max-h-52 overflow-y-auto p-1">
                                                {searchResults.map(res => (
                                                    <Button 
                                                        key={res.symbol}
                                                        variant="ghost" 
                                                        className="w-full justify-between items-center h-10 rounded-lg text-xs"
                                                        onClick={() => selectSymbol(res)}
                                                    >
                                                        <span className="font-bold">{res.symbol}</span>
                                                        <Badge variant="outline" className="text-[9px] h-4 px-1">{res.exchange}</Badge>
                                                    </Button>
                                                ))}
                                            </Card>
                                        )}
                                    </div>
                                </div>

                                <div className="w-28 space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Type</label>
                                    <select 
                                        value={form.transaction_type}
                                        onChange={e => setForm({...form, transaction_type: e.target.value})}
                                        className="w-full h-10 px-3 rounded-lg border border-border bg-background font-bold text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                    >
                                        <option value="BUY">BUY</option>
                                        <option value="SELL">SELL</option>
                                    </select>
                                </div>

                                <div className="w-20 space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">QTY</label>
                                    <Input 
                                        type="number"
                                        value={form.quantity}
                                        onChange={e => setForm({...form, quantity: e.target.value})}
                                        className="h-10 font-bold text-xs bg-background"
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <Button 
                                        onClick={editingOrder ? updateOrder : addToBasket}
                                        disabled={!form.tradingsymbol}
                                        size="sm"
                                        className="h-10 px-6 rounded-lg font-bold"
                                    >
                                        {editingOrder ? "Update" : "Add order"}
                                    </Button>
                                    {editingOrder && (
                                        <Button variant="outline" size="sm" className="h-10 px-3 rounded-lg" onClick={cancelEdit}>
                                            <X size={16} />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Orders List */}
                            <div className="space-y-2">
                                {orders.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 border border-dashed border-border rounded-xl text-muted-foreground">
                                        <ShoppingCart size={24} className="mb-3 opacity-20" />
                                        <p className="font-medium text-xs">Collection is empty. Build your strategy above.</p>
                                    </div>
                                ) : (
                                    orders.map(o => (
                                        <div key={o.id} className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-primary/20 transition-all shadow-sm group">
                                            <div className="flex items-center gap-4">
                                                <Badge variant={o.transaction_type === "BUY" ? "default" : "destructive"} className="h-8 w-14 items-center justify-center font-bold tracking-tighter text-[10px]">
                                                    {o.transaction_type}
                                                </Badge>
                                                <div>
                                                    <div className="font-bold text-base text-foreground">{o.tradingsymbol}</div>
                                                    <div className="flex gap-1.5 mt-0.5">
                                                        <Badge variant="outline" className="text-[9px] h-4 py-0 border-border text-muted-foreground">{o.exchange}</Badge>
                                                        <Badge variant="secondary" className="text-[9px] h-4 py-0">{o.product}</Badge>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <div className="text-sm font-bold text-foreground">{o.quantity} SHS</div>
                                                    <div className="text-[10px] font-medium text-muted-foreground">@ {o.order_type === "MARKET" ? "Market" : `₹${o.price}`}</div>
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400" onClick={() => editOrder(o)}>
                                                        <Pencil size={12} />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-rose-500" onClick={() => removeOrder(o.id)}>
                                                        <Trash2 size={12} />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center bg-card border border-dashed border-border rounded-3xl text-muted-foreground transition-all duration-300">
                        <Plus size={48} className="mb-6 opacity-10" />
                        <h3 className="text-lg font-bold text-foreground">Get Started</h3>
                        <p className="font-medium text-sm mt-1">Select or create a collection to manage bulk orders.</p>
                    </div>
                )}
            </div>

            <ConfirmDialog
                isOpen={confirmConfig.isOpen}
                onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmConfig.onConfirm}
                title={confirmConfig.title}
                message={confirmConfig.message}
                isDestructive={confirmConfig.isDestructive}
                confirmText={confirmConfig.confirmText}
            />
        </div>
    );
}

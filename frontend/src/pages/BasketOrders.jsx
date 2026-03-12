import { useState, useEffect, useRef } from "react";
import { toast } from 'react-toastify';
import api from "../api/api";
import { Plus, Trash2, Play, Search, X, Calculator, IndianRupee, Pencil, ShoppingCart } from "lucide-react";
import ConfirmDialog from "../components/ConfirmDialog";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
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
        document.title = "Baskets | Trading Panel";
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
        setFocusedIndex(-1);
    }, [searchResults]);

    const handleKeyDown = (e) => {
        if (searchResults.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setFocusedIndex(prev => (prev + 1) % searchResults.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setFocusedIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
        } else if (e.key === "Enter") {
            if (focusedIndex >= 0 && focusedIndex < searchResults.length) {
                selectSymbol(searchResults[focusedIndex]);
            }
        } else if (e.key === "Escape") {
            setSearchResults([]);
        }
    };



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

        calculateTotalMargin();
    }, [orders, selectedBasket]);


    const getBasketMargin = async (basketId, e) => {
        e.stopPropagation();
        try {
            const res = await api.get(`/baskets/${basketId}/margin`);
            const margin = res.data.requiredMargin;
            const updatedBaskets = baskets.map(b =>
                b.id === basketId ? { ...b, margin } : b
            );
            setBaskets(updatedBaskets);
            toast.info(`Margin Requirement: ₹${margin.toLocaleString()}`);
        } catch (err) {
            console.error("Margin fetch error", err);
            toast.error("Failed to fetch margin");
        }
    };

    const fetchBaskets = async () => {
        try {
            const res = await api.get("/baskets");
            setBaskets(res.data);
        } catch (err) {
            console.error("Failed to fetch baskets", err);
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
        } catch (err) {
            console.error("Failed to create basket", err);
            toast.error("Failed to create basket");
        }
    };

    const deleteBasket = (id, e) => {
        e.stopPropagation();
        setConfirmConfig({
            isOpen: true,
            title: "Delete Basket",
            message: "Are you sure you want to delete this basket? This action cannot be undone.",
            isDestructive: true,
            confirmText: "Delete",
            onConfirm: async () => {
                try {
                    await api.delete(`/baskets/${id}`);
                    setBaskets(prev => prev.filter(b => b.id !== id));
                    if (selectedBasket?.id === id) setSelectedBasket(null);
                    toast.success("Basket deleted");
                } catch (err) {
                    console.error("Failed to delete basket", err);
                    toast.error("Failed to delete basket");
                }
            }
        });
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

    const searchSymbols = async (text) => {
        setSearchQuery(text);
        if (text.length < 3) {
            setSearchResults([]);
            return;
        }


        try {
            const res = await api.get(`/companies/search?q=${text}`);
            setSearchResults(res.data || []);

            const tokens = (res.data || []).map(c => c.token);
            if (tokens.length > 0) {
                api.post("/subscribe", { tokens });
            }
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
        if (!selectedBasket || !form.tradingsymbol) {
            toast.warn("Please search and select a symbol first");
            return;
        }

        if (form.quantity < 1) {
            toast.warn("Quantity must be at least 1");
            return;
        }

        try {
            const res = await api.post(`/baskets/${selectedBasket.id}/orders`, form);
            setOrders([...orders, res.data]);
            toast.success("Order added to basket");

        } catch (err) {
            console.error(err);
            toast.error("Failed to add order");
        }
    };

    const removeOrder = async (orderId) => {
        try {
            await api.delete(`/baskets/orders/${orderId}`);
            setOrders(orders.filter(o => o.id !== orderId));
            if (editingOrder?.id === orderId) cancelEdit();
        } catch (err) {
            console.error(err);
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

        searchSymbols(order.tradingsymbol);
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
        setSelectedToken(null);
        setSearchResults([]);
    };

    const updateOrder = async () => {
        if (!editingOrder) return;

        try {
            const res = await api.put(`/baskets/orders/${editingOrder.id}`, form);
            setOrders(orders.map(o => o.id === editingOrder.id ? res.data : o));
            toast.success("Order updated successfully");
            cancelEdit();
        } catch (err) {
            console.error(err);
            toast.error("Failed to update order");
        }
    };

    const executeBasket = () => {
        if (!orders.length) return;

        setConfirmConfig({
            isOpen: true,
            title: "Execute Basket",
            message: `Are you sure you want to execute ${orders.length} orders in "${selectedBasket.name}"?`,
            isDestructive: false,
            confirmText: "Execute Orders",
            onConfirm: async () => {
                setExecuting(true);
                try {
                    const res = await api.post(`/baskets/${selectedBasket.id}/execute`);

                    const { success, failed } = res.data.results;

                    if (failed.length > 0) {
                        toast.warning(`Partial Success: ${success.length} OK, ${failed.length} Failed`);
                        toast.error(`Failure: ${failed[0].symbol} - ${failed[0].reason}`);
                    } else {
                        toast.success(`All ${success.length} orders executed successfully!`);
                    }

                } catch (err) {
                    console.error("Execution error", err);
                    toast.error("Execution failed completely");
                } finally {
                    setExecuting(false);
                }
            }
        });
    };

    return (
        <div className="flex h-screen bg-[#FFF5EC] pt-20 px-6 pb-6 gap-6">

            { }
            <div className="w-1/4 bg-white rounded-2xl shadow-sm border border-orange-100 flex flex-col overflow-hidden">
                <div className="p-6 border-b border-orange-100 flex justify-between items-center bg-orange-50/30">
                    <div>
                        <h2 className="font-bold text-slate-800 text-lg">Your Collections</h2>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Organize your trade ideas</p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full transition shadow-md hover:shadow-orange-200"
                        title="Create new collection"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                {showAddModal && (
                    <div className="p-3 bg-orange-50 border-b border-orange-100 animate-in fade-in slide-in-from-top-2">
                        <input
                            autoFocus
                            value={newBasketName}
                            onChange={e => setNewBasketName(e.target.value)}
                            placeholder="Basket Name..."
                            className="w-full px-3 py-2 rounded-lg border border-orange-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 mb-2"
                            onKeyDown={e => e.key === 'Enter' && createBasket()}
                        />
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setShowAddModal(false)} className="text-xs text-slate-500 hover:text-slate-700">Cancel</button>
                            <button onClick={createBasket} className="text-xs bg-orange-500 text-white px-3 py-1 rounded-md hover:bg-orange-600">Create</button>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {baskets.map(basket => (
                        <div
                            key={basket.id}
                            onClick={() => setSelectedBasket(basket)}
                            className={`p-4 rounded-2xl cursor-pointer flex justify-between items-center group transition-all duration-300 ${selectedBasket?.id === basket.id
                                ? "bg-orange-500 text-white shadow-lg shadow-orange-200 scale-[1.02]"
                                : "hover:bg-orange-50 text-slate-600 hover:translate-x-1"
                                }`}
                        >
                            <div className="flex-1 min-w-0 pr-2">
                                <div className="font-medium truncate">{basket.name}</div>
                                {basket.margin !== undefined && (
                                    <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                        Approx: ₹{basket.margin.toLocaleString()}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => getBasketMargin(basket.id, e)}
                                    title="Check Margin"
                                    className="p-1.5 rounded-md hover:bg-emerald-100 text-emerald-500 hover:text-emerald-700 transition"
                                >
                                    <Calculator size={14} />
                                </button>
                                <button
                                    onClick={(e) => deleteBasket(basket.id, e)}
                                    title="Delete"
                                    className={`p-1.5 rounded-md transition ${selectedBasket?.id === basket.id
                                        ? "hover:bg-orange-600 text-orange-100"
                                        : "hover:bg-red-100 text-red-400"
                                        }`}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {baskets.length === 0 && (
                        <div className="text-center text-slate-400 text-sm mt-10">No baskets created</div>
                    )}
                </div>
            </div>

            { }
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-orange-100 flex flex-col overflow-hidden">
                {selectedBasket ? (
                    <>
                        <div className="p-8 border-b border-orange-100 bg-white flex justify-between items-end">
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900 mb-1">{selectedBasket.name}</h1>
                                <p className="text-slate-500 font-medium">
                                    You have <span className="text-orange-600 font-bold">{orders.length} orders</span> ready in this group.
                                </p>
                            </div>

                            <div className="flex flex-col items-end gap-3">
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Estimated Funds</p>
                                    <div className="text-2xl font-bold text-slate-800">
                                        {calculatingMargin ? (
                                            <span className="animate-pulse text-slate-400 text-lg">Calculating...</span>
                                        ) : (
                                            <>₹{totalMargin.toLocaleString()}</>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={executeBasket}
                                    disabled={executing || orders.length === 0}
                                    className={`human-button shadow-xl transition-all ${executing || orders.length === 0
                                        ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                                        : "bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 active:scale-95 shadow-blue-100"
                                        }`}
                                >
                                    {executing ? (
                                        <>Processing...</>
                                    ) : (
                                        <>
                                            <Play size={20} fill="currentColor" /> Place these orders now
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            { }
                            <div className="bg-orange-50/50 p-6 rounded-[2rem] border border-orange-100 mb-8 flex flex-wrap gap-6 items-end">
                                <div className="flex-1 min-w-[280px] relative">
                                    <div className="flex justify-between items-center mb-2 px-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Search Asset</label>
                                        {selectedToken && livePrices[selectedToken] && (
                                            <div className="text-xs font-bold px-2 py-0.5 rounded-full bg-white border border-orange-100 shadow-sm">
                                                LTP: <span className={livePrices[selectedToken].ltp >= (livePrices[selectedToken].ohlc?.close || 0) ? "text-green-600" : "text-red-600"}>
                                                    ₹{livePrices[selectedToken].ltp.toFixed(2)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <input
                                            ref={searchRef}
                                            value={searchQuery}
                                            onChange={e => searchSymbols(e.target.value.toUpperCase())}
                                            onKeyDown={handleKeyDown}
                                            placeholder="What would you like to trade?"
                                            className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-transparent bg-white focus:border-orange-200 focus:outline-none focus:ring-4 focus:ring-orange-100 transition-all font-semibold uppercase placeholder:normal-case placeholder:font-normal"
                                        />
                                        <Search className="absolute left-4 top-4 text-orange-400" size={20} />

                                        {searchResults.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-orange-50 z-50 max-h-72 overflow-hidden overflow-y-auto animate-in fade-in slide-in-from-top-4">
                                                {searchResults.map((res, index) => {
                                                    const isFocused = index === focusedIndex;
                                                    return (
                                                        <div
                                                            key={res.token}
                                                            onClick={() => selectSymbol(res)}
                                                            onMouseEnter={() => setFocusedIndex(index)}
                                                            className={`px-5 py-4 cursor-pointer flex justify-between items-center transition-colors border-b border-slate-50 last:border-0 ${isFocused ? "bg-orange-50" : "hover:bg-orange-50/50"}`}
                                                        >
                                                            <div>
                                                                <span className="font-bold text-slate-800 text-base">{res.symbol}</span>
                                                                <p className="text-[10px] text-slate-400 font-bold uppercase">{res.exchange}</p>
                                                            </div>
                                                            <div className="flex flex-col items-end">
                                                                {livePrices[res.token] && (
                                                                    <span className={`font-bold text-sm ${livePrices[res.token].ltp >= (livePrices[res.token].ohlc?.close || 0) ? "text-green-600" : "text-red-600"}`}>
                                                                        ₹{livePrices[res.token].ltp.toFixed(2)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="w-32">
                                    <label className="text-xs font-bold text-slate-500 mb-2 block px-1 uppercase tracking-wider">Action</label>
                                    <select
                                        value={form.transaction_type}
                                        onChange={e => setForm({ ...form, transaction_type: e.target.value })}
                                        className={`w-full py-3.5 px-4 rounded-2xl border-2 cursor-pointer font-bold transition-all focus:outline-none ${form.transaction_type === "BUY"
                                            ? "bg-green-50 text-green-700 border-green-200 focus:ring-4 focus:ring-green-100"
                                            : "bg-red-50 text-red-700 border-red-200 focus:ring-4 focus:ring-red-100"
                                            }`}
                                    >
                                        <option value="BUY">BUY</option>
                                        <option value="SELL">SELL</option>
                                    </select>
                                </div>

                                <div className="w-32">
                                    <label className="text-xs font-bold text-slate-500 mb-2 block px-1 uppercase tracking-wider">Product</label>
                                    <select
                                        value={form.product}
                                        onChange={e => setForm({ ...form, product: e.target.value })}
                                        className="w-full py-3.5 px-4 rounded-2xl border-2 border-transparent bg-white focus:border-orange-200 focus:outline-none focus:ring-4 focus:ring-orange-100 font-bold transition-all"
                                    >
                                        <option value="MIS">Intraday</option>
                                        <option value="CNC">Longterm</option>
                                        <option value="NRML">Normal</option>
                                    </select>
                                </div>

                                <div className="w-28">
                                    <label className="text-xs font-bold text-slate-500 mb-2 block px-1 uppercase tracking-wider">Quantity</label>
                                    <input
                                        type="number"
                                        value={form.quantity}
                                        onChange={e => {
                                            const val = parseInt(e.target.value);
                                            setForm({ ...form, quantity: isNaN(val) ? "" : val });
                                        }}
                                        className="w-full py-3.5 px-4 rounded-2xl border-2 border-transparent bg-white focus:border-orange-200 focus:outline-none focus:ring-4 focus:ring-orange-100 font-bold transition-all"
                                        min="1"
                                    />
                                </div>

                                <div className="w-32">
                                    <label className="text-xs font-bold text-slate-500 mb-2 block px-1 uppercase tracking-wider">Price</label>
                                    <input
                                        type="number"
                                        disabled={form.order_type === "MARKET"}
                                        value={form.price}
                                        onChange={e => setForm({ ...form, price: e.target.value })}
                                        placeholder={form.order_type === "MARKET" ? "Market" : "0.00"}
                                        className={`w-full py-3.5 px-4 rounded-2xl border-2 font-bold transition-all focus:outline-none ${form.order_type === "MARKET"
                                            ? "bg-slate-100 border-transparent text-slate-400 cursor-not-allowed"
                                            : "border-transparent bg-white focus:border-orange-200 focus:ring-4 focus:ring-orange-100"
                                            }`}
                                    />
                                </div>

                                <div className="w-32">
                                    <label className="text-xs font-bold text-slate-500 mb-2 block px-1 uppercase tracking-wider">Stop Loss</label>
                                    <input
                                        type="number"
                                        value={form.stoploss_price}
                                        onChange={e => setForm({ ...form, stoploss_price: e.target.value })}
                                        placeholder="0.00"
                                        className="w-full py-3.5 px-4 rounded-2xl border-2 border-transparent bg-white focus:border-red-200 focus:outline-none focus:ring-4 focus:ring-red-100 font-bold transition-all text-red-600"
                                        step="0.05"
                                    />
                                </div>

                                <div className="w-32">
                                    <label className="text-xs font-bold text-slate-500 mb-2 block px-1 uppercase tracking-wider">Target</label>
                                    <input
                                        type="number"
                                        value={form.target_price}
                                        onChange={e => setForm({ ...form, target_price: e.target.value })}
                                        placeholder="0.00"
                                        className="w-full py-3.5 px-4 rounded-2xl border-2 border-transparent bg-white focus:border-green-200 focus:outline-none focus:ring-4 focus:ring-green-100 font-bold transition-all text-green-600"
                                        step="0.05"
                                    />
                                </div>

                                {editingOrder ? (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={cancelEdit}
                                            className="bg-slate-200 text-slate-700 font-bold py-3.5 px-6 rounded-2xl hover:bg-slate-300 transition-all font-heading"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={updateOrder}
                                            className="bg-blue-600 text-white font-bold py-3.5 px-8 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 font-heading"
                                        >
                                            Update
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={addToBasket}
                                        disabled={!form.tradingsymbol}
                                        className="bg-slate-900 text-white font-bold py-3.5 px-8 rounded-2xl hover:bg-black disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xl font-heading"
                                    >
                                        Add to List
                                    </button>
                                )}
                            </div>

                            { }
                            <div className="space-y-4">
                                {orders.length === 0 ? (
                                    <div className="text-center py-20 bg-slate-50/50 border-2 border-dashed border-orange-100 rounded-[2.5rem]">
                                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                            <ShoppingCart className="text-orange-300" size={24} />
                                        </div>
                                        <p className="text-slate-400 font-medium">Your collection is empty.</p>
                                        <p className="text-slate-300 text-xs mt-1">Add some trades above to get started!</p>
                                    </div>
                                ) : (
                                    orders.map(order => (
                                        <div
                                            key={order.id}
                                            className="soft-card p-6 flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-6">
                                                <div className={`p-4 rounded-2xl ${order.transaction_type === "BUY"
                                                        ? "bg-green-50 text-green-600"
                                                        : "bg-red-50 text-red-600"
                                                    } font-bold text-sm shadow-sm group-hover:scale-110 transition-transform`}>
                                                    {order.transaction_type}
                                                </div>

                                                <div>
                                                    <div className="font-bold text-xl text-slate-800">{order.tradingsymbol}</div>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase">{order.exchange}</span>
                                                        <span className="text-[10px] bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full font-bold uppercase">{order.product}</span>
                                                        <span className="text-[10px] bg-orange-50 text-orange-500 px-2 py-0.5 rounded-full font-bold uppercase">{order.order_type}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-12">
                                                <div className="text-right">
                                                    <div className="text-lg font-bold text-slate-800">{order.quantity} <span className="text-slate-400 text-sm font-medium uppercase tracking-widest ml-1">shares</span></div>
                                                    <div className="text-sm font-semibold text-slate-500">
                                                        {order.order_type === "MARKET" ? "Market Price" : `₹${order.price}`}
                                                    </div>
                                                    <div className="flex gap-2 mt-2 justify-end">
                                                        {parseFloat(order.stoploss_price) > 0 && (
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-[8px] font-bold text-red-400 uppercase tracking-tighter">Stop</span>
                                                                <span className="text-xs text-red-600 font-bold">₹{order.stoploss_price}</span>
                                                            </div>
                                                        )}
                                                        {parseFloat(order.target_price) > 0 && (
                                                            <div className="flex flex-col items-end border-l border-slate-100 pl-3 ml-1">
                                                                <span className="text-[8px] font-bold text-green-400 uppercase tracking-tighter">Target</span>
                                                                <span className="text-xs text-green-600 font-bold">₹{order.target_price}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => editOrder(order)}
                                                        className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all"
                                                        title="Refine trade"
                                                    >
                                                        <Pencil size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => removeOrder(order.id)}
                                                        className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                                        title="Remove"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mb-4">
                            <Plus size={32} className="text-orange-300" />
                        </div>
                        <p className="font-medium">Select or create a basket to get started</p>
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

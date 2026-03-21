import { useState, useEffect } from "react";
import { useNavigate, NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ShoppingCart, Briefcase, BarChart3,
  PanelRight, History, Package, ShieldCheck, ChevronDown,
  Layers, Wallet, Menu, X, AlertTriangle
} from "lucide-react";
import { useBroker } from "../context/BrokerContext";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isConnected } = useBroker();

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("token"));
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    setIsLoggedIn(false);
    navigate("/auth");
  };

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  if (location.pathname === "/auth" || location.pathname === "/history") return null;

  const PortfolioLinks = [
    { to: "/orders", label: "Orders", icon: <ShoppingCart size={16} /> },
    { to: "/positions", label: "Positions", icon: <BarChart3 size={16} /> },
    { to: "/holdings", label: "Holdings", icon: <Briefcase size={16} /> },
  ];

  const TradingLinks = [
    { to: "/panel", label: "Live Panel", icon: <PanelRight size={16} /> },
    { to: "/baskets", label: "Baskets", icon: <Package size={16} /> },
  ];

const isDarkPage = location.pathname === "/";

  return (
    <>
      {isLoggedIn && !isConnected && (
        <div className="bg-red-500 text-white text-xs font-semibold py-1.5 px-4 text-center z-[120] relative flex items-center justify-center gap-2">
          <AlertTriangle size={14} />
          <span>Angel One is disconnected. Trading is disabled.</span>
          <NavLink to="/broker" className="underline ml-2 hover:text-red-100">Reconnect</NavLink>
        </div>
      )}
      <div className={`fixed ${isLoggedIn && !isConnected ? 'top-7' : 'top-0'} left-0 right-0 z-[110] transition-all duration-300 border-b ${
        isDarkPage 
          ? "bg-zinc-950/50 backdrop-blur-md border-white/5" 
          : "bg-white border-zinc-200"
      }`}>
        {/* Desktop Navbar */}
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center transition-colors ${
              isDarkPage ? "bg-white/10" : "bg-zinc-100"
            }`}>
              <img src="/logo.png" alt="TradeScope Logo" className="w-full h-full object-cover" />
            </div>
            <span className={`font-bold text-base tracking-tight transition-colors ${
              isDarkPage ? "text-white" : "text-zinc-900"
            }`}>TradeScope</span>
          </NavLink>

          <nav className="hidden md:flex items-center gap-1">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  isActive 
                    ? (isDarkPage ? "text-white bg-white/10" : "text-zinc-900 bg-zinc-100") 
                    : (isDarkPage ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50")
                }`
              }
            >
              Dashboard
            </NavLink>

            {/* Portfolio Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setActiveDropdown('portfolio')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeDropdown === 'portfolio' 
                  ? (isDarkPage ? "text-white bg-white/10" : "text-zinc-900 bg-zinc-100") 
                  : (isDarkPage ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50")
              }`}>
                 Portfolio
                 <ChevronDown size={14} className={`transition-transform duration-200 ${activeDropdown === 'portfolio' ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {activeDropdown === 'portfolio' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className={`absolute top-full left-0 mt-1 w-48 border rounded-lg shadow-xl p-1.5 z-50 ${
                      isDarkPage ? "bg-zinc-900 border-white/10" : "bg-white border-zinc-200"
                    }`}
                  >
                    {PortfolioLinks.map(link => (
                      <NavLink key={link.to} to={link.to} className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive 
                          ? (isDarkPage ? "bg-white/10 text-white" : "bg-zinc-100 text-zinc-900") 
                          : (isDarkPage ? "text-zinc-400 hover:bg-white/5 hover:text-white" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900")
                      }`}>
                        {link.icon}
                        {link.label}
                      </NavLink>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Trading Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setActiveDropdown('trading')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeDropdown === 'trading' 
                  ? (isDarkPage ? "text-white bg-white/10" : "text-zinc-900 bg-zinc-100") 
                  : (isDarkPage ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50")
              }`}>
                 Trading
                 <ChevronDown size={14} className={`transition-transform duration-200 ${activeDropdown === 'trading' ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {activeDropdown === 'trading' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 0 }}
                    className={`absolute top-full left-0 mt-1 w-48 border rounded-lg shadow-xl p-1.5 z-50 ${
                      isDarkPage ? "bg-zinc-900 border-white/10" : "bg-white border-zinc-200"
                    }`}
                  >
                    {TradingLinks.map(link => (
                      <NavLink key={link.to} to={link.to} className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive 
                          ? (isDarkPage ? "bg-white/10 text-white" : "bg-zinc-100 text-zinc-900") 
                          : (isDarkPage ? "text-zinc-400 hover:bg-white/5 hover:text-white" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900")
                      }`}>
                        {link.icon}
                        {link.label}
                      </NavLink>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <NavLink
              to="/history"
              className={({ isActive }) =>
                `px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  isActive 
                    ? (isDarkPage ? "text-white bg-white/10" : "text-zinc-900 bg-zinc-100") 
                    : (isDarkPage ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50")
                }`
              }
            >
              Analytics
            </NavLink>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className={`rounded-md font-bold px-4 transition-all ${
              isDarkPage ? "border-white/10 bg-white/5 text-white hover:text-white hover:bg-white/10" : "border-zinc-200"
            }`}>
              <NavLink to="/broker">
                <ShieldCheck size={16} className={`mr-2 ${isDarkPage ? "text-emerald-400" : "text-emerald-600"}`} /> Angel Login
              </NavLink>
            </Button>
            
            {isLoggedIn ? (
               <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className={`rounded-md font-bold transition-all ${
                  isDarkPage ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                }`}
               >
                 Logout
               </Button>
            ) : (
               <Button asChild variant="default" size="sm" className={`rounded-md font-bold px-6 transition-all ${
                 isDarkPage ? "bg-white text-zinc-900 hover:bg-zinc-200" : "bg-zinc-900 text-white"
               }`}>
                 <NavLink to="/auth">User Login</NavLink>
               </Button>
            )}
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-zinc-600"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-zinc-200 bg-white overflow-hidden"
            >
              <div className="px-6 py-4 flex flex-col gap-1">
                <NavLink to="/" className="px-4 py-3 rounded-md text-base font-medium text-zinc-900 hover:bg-zinc-50">Dashboard</NavLink>

                <div className="py-2">
                  <div className="px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Portfolio</div>
                  {PortfolioLinks.map(link => (
                    <NavLink key={link.to} to={link.to} className="flex items-center gap-3 px-4 py-3 rounded-md text-base font-medium text-zinc-600 hover:bg-zinc-50">
                      {link.icon} {link.label}
                    </NavLink>
                  ))}
                </div>

                <div className="py-2">
                  <div className="px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Trading</div>
                  {TradingLinks.map(link => (
                    <NavLink key={link.to} to={link.to} className="flex items-center gap-3 px-4 py-3 rounded-md text-base font-medium text-zinc-600 hover:bg-zinc-50">
                      {link.icon} {link.label}
                    </NavLink>
                  ))}
                </div>

                <NavLink to="/history" className="px-4 py-3 rounded-md text-base font-medium text-zinc-900 hover:bg-zinc-50">Analytics</NavLink>

                <div className="pt-4 mt-2 border-t border-zinc-100">
                  <NavLink to="/broker" className="flex items-center gap-3 px-4 py-3 rounded-md text-base font-medium text-orange-600 hover:bg-orange-50">
                    <ShieldCheck size={20} /> Broker Login
                  </NavLink>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

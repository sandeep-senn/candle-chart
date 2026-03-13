import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, ShoppingCart, Briefcase, BarChart3, 
  PanelRight, History, Package, ShieldCheck, ChevronDown, 
  Layers, Wallet 
} from "lucide-react";

export default function Navbar() {
  const location = useLocation();
  const [activeDropdown, setActiveDropdown] = useState(null);

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

  return (
    <div className="fixed top-6 left-0 right-0 flex justify-center z-[100] px-6">
      <nav className="relative bg-white/70 backdrop-blur-2xl border border-white/40 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] px-4 py-2 flex items-center gap-1">
        
        {/* Home */}
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-500 font-bold text-sm ${
              isActive ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`
          }
        >
          <LayoutDashboard size={18} />
          <span>Home</span>
        </NavLink>

        {/* Portfolio Dropdown */}
        <div 
          className="relative group"
          onMouseEnter={() => setActiveDropdown('portfolio')}
          onMouseLeave={() => setActiveDropdown(null)}
        >
          <button className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-500 font-bold text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-50 ${activeDropdown === 'portfolio' ? 'bg-slate-50' : ''}`}>
             <Wallet size={18} />
             <span>Portfolio</span>
             <ChevronDown size={14} className={`transition-transform duration-500 ${activeDropdown === 'portfolio' ? 'rotate-180' : ''}`} />
          </button>
          
          <div className={`absolute top-full left-0 mt-3 w-56 bg-white/90 backdrop-blur-2xl border border-slate-100 rounded-[2rem] shadow-2xl p-3 transition-all duration-500 transform origin-top ${activeDropdown === 'portfolio' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
            <div className="grid gap-1">
              {PortfolioLinks.map(link => (
                <NavLink key={link.to} to={link.to} className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-xs ${isActive ? "bg-orange-500 text-white shadow-md shadow-orange-100" : "text-slate-500 hover:bg-orange-50 hover:text-orange-600"}`}>
                  {link.icon}
                  {link.label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>

        {/* Trading Dropdown */}
        <div 
          className="relative group"
          onMouseEnter={() => setActiveDropdown('trading')}
          onMouseLeave={() => setActiveDropdown(null)}
        >
          <button className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-500 font-bold text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-50 ${activeDropdown === 'trading' ? 'bg-slate-50' : ''}`}>
             <Layers size={18} />
             <span>Trade</span>
             <ChevronDown size={14} className={`transition-transform duration-500 ${activeDropdown === 'trading' ? 'rotate-180' : ''}`} />
          </button>
          
          <div className={`absolute top-full left-0 mt-3 w-56 bg-white/90 backdrop-blur-2xl border border-slate-100 rounded-[2rem] shadow-2xl p-3 transition-all duration-500 transform origin-top ${activeDropdown === 'trading' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
            <div className="grid gap-1">
              {TradingLinks.map(link => (
                <NavLink key={link.to} to={link.to} className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-xs ${isActive ? "bg-orange-500 text-white shadow-md shadow-orange-100" : "text-slate-500 hover:bg-orange-50 hover:text-orange-600"}`}>
                  {link.icon}
                  {link.label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>

        {/* History */}
        <NavLink
            to="/history"
            className={({ isActive }) =>
              `flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-500 font-bold text-sm ${
                isActive ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`
            }
          >
            <History size={18} />
            <span className="hidden md:inline">Analytics</span>
        </NavLink>

        {/* Broker Security */}
        <NavLink
          to="/broker"
          className={({ isActive }) =>
            `flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-500 font-bold text-sm ${
              isActive ? "bg-orange-500 text-white shadow-lg shadow-orange-100" : "bg-orange-50 text-orange-600 hover:bg-orange-100"
            }`
          }
        >
          <ShieldCheck size={18} />
          <span className="hidden md:inline">Broker Login</span>
        </NavLink>

      </nav>
    </div>
  );
}

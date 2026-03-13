import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, ShoppingCart, Briefcase, BarChart3, PanelRight, History, Package } from "lucide-react";

export default function Navbar() {
  const location = useLocation();

  if (location.pathname === "/auth" || location.pathname === "/history") return null;

  const links = [
    { to: "/", label: "Home", icon: <LayoutDashboard size={18} /> },
    { to: "/orders", label: "Orders", icon: <ShoppingCart size={18} /> },
    { to: "/positions", label: "Positions", icon: <BarChart3 size={18} /> },
    { to: "/holdings", label: "Holdings", icon: <Briefcase size={18} /> },
    { to: "/panel", label: "Panel", icon: <PanelRight size={18} /> },
    { to: "/baskets", label: "Baskets", icon: <Package size={18} /> },
    { to: "/history", label: "History", icon: <History size={18} /> },
    { to: "/broker", label: "Broker", icon: <ShieldCheck size={18} /> },
  ];

  return (
    <div className="fixed top-8 left-0 right-0 flex justify-center z-50 px-6">
      <nav className="pill-nav overflow-x-auto max-w-4xl no-scrollbar">
        <div className="flex items-center gap-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 font-semibold truncate ${isActive
                  ? "bg-orange-500 text-white shadow-md shadow-orange-200"
                  : "text-slate-500 hover:text-slate-900 hover:bg-orange-50"
                }`
              }
            >
              {link.icon}
              <span className="hidden md:inline">{link.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

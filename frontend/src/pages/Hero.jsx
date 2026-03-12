import { useEffect } from "react";
import { ArrowRight, Sparkles, TrendingUp, ShieldCheck, Heart } from "lucide-react";
import { NavLink } from "react-router-dom";

export default function Hero() {
  useEffect(() => {
    document.title = "Candle | Your Trading Companion";
  }, []);

  return (
    <section className="relative min-h-[90vh] flex flex-col items-center px-6 pt-32 overflow-hidden">

      <div className="flex flex-col justify-center items-center text-center max-w-5xl z-10">

        {/* Friendly Badge */}
        <div className="mb-6 flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100/50 border border-orange-200 text-orange-700 text-sm font-bold animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Sparkles size={16} />
          <span>Made for humans, by humans</span>
        </div>

        <h1 className="text-6xl md:text-7xl font-bold text-slate-900 leading-[1.1] tracking-tight">
          Hello there! Ready to <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-rose-500">
            trade with heart.
          </span>
        </h1>

        <p className="mt-8 text-slate-500 max-w-2xl text-xl leading-relaxed font-medium">
          Trading doesn't have to be cold and clinical. Welcome to <span className="text-slate-800 font-bold">Candle</span>,
          your warm, intuitive space to manage your financial journey with clarity and peace of mind.
        </p>

        <div className="mt-12 flex flex-wrap justify-center gap-4">
          <NavLink
            to="/panel"
            className="human-button bg-slate-900 text-white shadow-2xl shadow-slate-200 hover:bg-black group"
          >
            Start Trading <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </NavLink>
          <NavLink
            to="/baskets"
            className="human-button bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
          >
            Manage Collections
          </NavLink>
        </div>

        {/* Feature Cards - the 'Human' touch */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl px-4">
          <div className="soft-card p-8 group hover:-translate-y-2">
            <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 mb-6 group-hover:scale-110 transition-transform">
              <TrendingUp size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">Intuitive Flow</h3>
            <p className="text-slate-500 leading-relaxed font-medium">Design sounds technical. We call it "Flow". Everything is where you expect it to be.</p>
          </div>

          <div className="soft-card p-8 group hover:-translate-y-2" style={{ transitionDelay: '100ms' }}>
            <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
              <ShieldCheck size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">Safe & Sound</h3>
            <p className="text-slate-500 leading-relaxed font-medium">Your data, your trades, protected with care. We treat your security like our own.</p>
          </div>

          <div className="soft-card p-8 group hover:-translate-y-2" style={{ transitionDelay: '200ms' }}>
            <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 mb-6 group-hover:scale-110 transition-transform">
              <Heart size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">Trader First</h3>
            <p className="text-slate-500 leading-relaxed font-medium">Every feature we build starts with a simple question: How does this help you?</p>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="mt-32 pb-12 opacity-30 animate-bounce">
        <ArrowRight size={24} className="rotate-90" />
      </div>
    </section>
  );
}

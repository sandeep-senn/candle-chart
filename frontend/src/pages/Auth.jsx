import { useState } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { User, Mail, Lock, ArrowRight, Heart } from "lucide-react";

export default function Auth() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === "register") {
      api.post("/auth/register", {
        username: form.username,
        email: form.email,
        password: form.password,
      })
        .then(() => {
          toast.success("Welcome aboard! You can now log in.");
          setMode("login");
        })
        .catch(err => toast.error(err.response?.data?.message || "Registration failed"));
    } else if (mode === "login") {
      api.post("/auth/login", {
        email: form.email,
        password: form.password,
      })
        .then(res => {
          const token = res.data.token;
          localStorage.setItem("token", token);
          toast.success("Good to see you again!");
          navigate("/");
        })
        .catch(err => toast.error(err.response?.data?.message || "Login failed"));
    } else if (mode === "forgot") {
      api.post("/auth/forgot-password", {
        email: form.email,
      })
        .then(() => {
          toast.success("We've sent a rescue link to your email.");
          setMode("login");
        })
        .catch(err => toast.error(err.response?.data?.message || "Failed to send reset link"));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">

      {/* Aesthetic Card */}
      <div className="soft-card w-full max-w-md p-10 md:p-12 relative overflow-hidden group">

        {/* Background Accent */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-orange-100/50 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>

        <div className="relative z-10 text-center mb-10">
          <div className="w-16 h-16 bg-orange-500 rounded-2xl shadow-xl shadow-orange-100 flex items-center justify-center mx-auto mb-6">
            <Heart className="text-white fill-white/20" size={32} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            {mode === "login" && "Welcome Home"}
            {mode === "register" && "Join the Family"}
            {mode === "forgot" && "Reset Password"}
          </h2>
          <p className="text-slate-500 mt-2 font-medium">
            {mode === "login" && "Ready to continue your journey?"}
            {mode === "register" && "Start your trading adventure today."}
            {mode === "forgot" && "We'll help you get back in."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 relative z-10">
          {mode === "register" && (
            <div className="relative flex items-center">
              <User className="absolute left-4 text-slate-300" size={18} />
              <input
                name="username"
                placeholder="What should we call you?"
                onChange={handleChange}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-orange-500 focus:bg-white rounded-2xl px-12 py-4 text-sm font-bold text-slate-800 outline-none transition-all placeholder:text-slate-300"
                required
              />
            </div>
          )}

          {(mode === "login" || mode === "register" || mode === "forgot") && (
            <div className="relative flex items-center">
              <Mail className="absolute left-4 text-slate-300" size={18} />
              <input
                name="email"
                type="email"
                placeholder="Email address"
                onChange={handleChange}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-orange-500 focus:bg-white rounded-2xl px-12 py-4 text-sm font-bold text-slate-800 outline-none transition-all placeholder:text-slate-300"
                required
              />
            </div>
          )}

          {(mode === "login" || mode === "register") && (
            <div className="relative flex items-center">
              <Lock className="absolute left-4 text-slate-300" size={18} />
              <input
                name="password"
                type="password"
                placeholder="Secure Password"
                onChange={handleChange}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-orange-500 focus:bg-white rounded-2xl px-12 py-4 text-sm font-bold text-slate-800 outline-none transition-all placeholder:text-slate-300"
                required
              />
            </div>
          )}

          <button className="human-button bg-orange-600 text-white shadow-xl shadow-orange-100 hover:bg-orange-700 w-full flex justify-center py-4 mt-2">
            <span>
              {mode === "login" && "Enter Dashboard"}
              {mode === "register" && "Create My Account"}
              {mode === "forgot" && "Send Rescue Link"}
            </span>
            <ArrowRight size={18} className="ml-2" />
          </button>
        </form>

        <div className="text-center mt-10 space-y-4 relative z-10">
          {mode === "login" && (
            <>
              <p className="text-slate-500 text-sm font-medium">
                New around here?{" "}
                <button
                  className="text-orange-600 font-bold hover:underline"
                  onClick={() => setMode("register")}
                >
                  Join us
                </button>
              </p>
              <button
                className="text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-orange-500 transition-colors"
                onClick={() => setMode("forgot")}
              >
                Forgot your key?
              </button>
            </>
          )}

          {mode === "register" && (
            <p className="text-slate-500 text-sm font-medium">
              Already have an account?{" "}
              <button
                className="text-orange-600 font-bold hover:underline"
                onClick={() => setMode("login")}
              >
                Log in
              </button>
            </p>
          )}

          {mode === "forgot" && (
            <button
              className="text-orange-600 font-bold hover:underline text-sm"
              onClick={() => setMode("login")}
            >
              Back to Safety
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

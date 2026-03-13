import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import Auth from "./pages/Auth";
import Hero from "./pages/Hero";
import Orders from "./pages/Orders";
import Positions from "./pages/Positions";
import Holdings from "./pages/Holdings";
import TradingPanel from "./pages/TradingPanel";
import ChangePassword from "./pages/ChangePassword";
import HistoryDashboard from "./pages/HistoryDashboard";
import BasketOrders from "./pages/BasketOrders";
import BrokerSettings from "./pages/BrokerSettings";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function App() {
  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* Organic Human-like Background Elements */}
      <div className="organic-blob w-[500px] h-[500px] bg-orange-200 -top-20 -left-20 animate-float"></div>
      <div className="organic-blob w-96 h-96 bg-blue-100 bottom-0 -right-10 animate-float" style={{ animationDelay: '-5s' }}></div>

      <Navbar />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        toastStyle={{ borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
      />

      <Routes>

        { }
        <Route path="/auth" element={<Auth />} />

        { }
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Hero />
            </ProtectedRoute>
          }
        />

        <Route
          path="/panel"
          element={
            <ProtectedRoute>
              <TradingPanel />
            </ProtectedRoute>
          }
        />

        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          }
        />

        <Route
          path="/positions"
          element={
            <ProtectedRoute>
              <Positions />
            </ProtectedRoute>
          }
        />

        <Route
          path="/holdings"
          element={
            <ProtectedRoute>
              <Holdings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          }
        />

        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <HistoryDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/baskets"
          element={
            <ProtectedRoute>
              <BasketOrders />
            </ProtectedRoute>
          }
        />

        <Route
          path="/broker"
          element={
            <ProtectedRoute>
              <BrokerSettings />
            </ProtectedRoute>
          }
        />

      </Routes>
    </div>
  );
}

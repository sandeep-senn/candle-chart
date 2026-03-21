import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../api/api";

const BrokerContext = createContext({
  isConnected: true,
  setIsConnected: () => {},
  checkStatus: async () => {}
});

export const BrokerProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true);

  const checkStatus = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await api.get("/angel/status");
      if (res.data?.status === "DISCONNECTED") {
        setIsConnected(false);
      } else if (res.data?.status === "CONNECTED") {
        setIsConnected(true);
      }
    } catch (err) {
      // Ignore 401s handled by interceptor, or 403s
    }
  };

  useEffect(() => {
    checkStatus();

    // Listen for custom event from axios interceptor
    const handleDisconnect = () => setIsConnected(false);
    window.addEventListener("broker-disconnected", handleDisconnect);

    // Poll every 30 seconds
    const interval = setInterval(checkStatus, 30000);

    return () => {
      window.removeEventListener("broker-disconnected", handleDisconnect);
      clearInterval(interval);
    };
  }, []);

  return (
    <BrokerContext.Provider value={{ isConnected, setIsConnected, checkStatus }}>
      {children}
    </BrokerContext.Provider>
  );
};

export const useBroker = () => useContext(BrokerContext);

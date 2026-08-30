"use client";

import React, { createContext, useContext, useCallback, useEffect, useState } from "react";

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

function ClientToast({ message, type = "info", onClose }) {
  const colors = { success: { bg: "#EDFBF2", fg: "#2E9E5B" }, danger: { bg: "#FBEDED", fg: "#C24444" }, warning: { bg: "#FEFAF0", fg: "#D9A536" }, info: { bg: "#EEF4FA", fg: "#2C6BA0" } };
  const c = colors[type] || colors.info;
  useEffect(() => {
    const timeoutId = setTimeout(onClose, 5000);
    return () => clearTimeout(timeoutId);
  }, [onClose]);
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: c.bg, color: c.fg, boxShadow: "0 8px 30px rgba(0,0,0,0.12)", minWidth: 260 }}>
        <div style={{ fontWeight: 700 }}>{message}</div>
        <button onClick={onClose} style={{ marginLeft: "auto", background: "transparent", border: "none", cursor: "pointer", color: c.fg }}>×</button>
      </div>
    </div>
  );
}

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, type = "info", opts = {}) => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((t) => [...t, { id, message, type }]);
    if (opts.autoClose !== false) setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), opts.duration || 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      {toasts.length > 0 && <ClientToast message={toasts[toasts.length - 1].message} type={toasts[toasts.length - 1].type} onClose={() => setToasts((t) => t.slice(0, -1))} />}
    </ToastContext.Provider>
  );
}

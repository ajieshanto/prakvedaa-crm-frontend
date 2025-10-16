// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import "./reset.css";
import Login from "./pages/Login";
import Sales from "./pages/Sales";
import Doctor from "./pages/Doctor";


function Guard({ role, children }: { role: "sales" | "doctor"; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={user.role === "sales" ? "/sales" : "/doctor"} replace />;
  return <>{children}</>;
}

function Root() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "sales" ? "/sales" : "/doctor"} replace />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Root />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/sales"
            element={
              <Guard role="sales">
                <Sales />
              </Guard>
            }
          />
          <Route
            path="/doctor"
            element={
              <Guard role="doctor">
                <Doctor />
              </Guard>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);

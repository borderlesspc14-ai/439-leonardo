import React, { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { LoginPage } from "../screens/LoginPage";
import { RegisterPage } from "../screens/RegisterPage";
import { RecoverPasswordPage } from "../screens/RecoverPasswordPage";
import { DashboardPage } from "../screens/DashboardPage";

export type AuthView = "login" | "register" | "recover";

export const Router: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [view, setView] = useState<AuthView>("login");

  if (!isAuthenticated) {
    if (view === "register") {
      return <RegisterPage onNavigate={setView} />;
    }
    if (view === "recover") {
      return <RecoverPasswordPage onNavigate={setView} />;
    }
    return <LoginPage onNavigate={setView} />;
  }

  return <DashboardPage />;
};


import React from "react";
import { AuthProvider } from "./auth/AuthContext";
import { Layout } from "./layout/Layout";
import { Router } from "./router/Router";

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Layout>
        <Router />
      </Layout>
    </AuthProvider>
  );
};


import React from "react";
import { MainViewProvider } from "../context/MainViewContext";
import { Sidebar } from "./Sidebar";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <MainViewProvider>
      <div className="min-h-screen bg-white text-black flex">
        <Sidebar />
        <main className="flex-1 min-h-screen bg-white text-black border-l border-border">
          <div className="max-w-6xl mx-auto px-6 py-6">{children}</div>
        </main>
      </div>
    </MainViewProvider>
  );
};


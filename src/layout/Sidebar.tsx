import React, { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useMainView } from "../context/MainViewContext";
import { LogOut, Shield, LayoutDashboard, User, Users } from "lucide-react";
import { ProfileModal } from "../components/ProfileModal";

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { mainView, setMainView } = useMainView();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-gray-700 bg-black text-white">
      <div className="px-6 py-6 border-b border-gray-700 flex items-center justify-between">
        <div>
          <div className="uppercase tracking-[0.2em] text-xs text-gray-400">
            Painel
          </div>
          <div className="text-lg font-semibold text-white">
            Hublog WMS+
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 text-sm">
        <div className="text-[10px] font-medium tracking-[0.16em] text-gray-400 uppercase mb-2">
          Navegação
        </div>
        {user?.role === "MASTER" ? (
          <button
            type="button"
            onClick={() => setMainView("accounts")}
            className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-xs ${
              mainView === "accounts" || mainView === "account"
                ? "bg-gray-800 text-white"
                : "text-gray-300 hover:bg-gray-800"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Contas</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setMainView("dashboard")}
            className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-xs bg-gray-800 text-white"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Recibos de armazém</span>
          </button>
        )}
      </nav>

      <div className="border-t border-gray-700 px-4 py-4 text-xs flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          className="flex items-center gap-2 min-w-0 flex-1 text-left rounded-md hover:bg-gray-800/50 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0">
            {user?.photoBase64 ? (
              <img src={user.photoBase64} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-4 h-4 text-white" />
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium text-xs text-white">
              {user?.displayName || user?.name || "Visitante"}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-gray-400 uppercase tracking-[0.16em]">
              <Shield className="w-3 h-3" />
              <span>{user?.role ?? "SEM SESSÃO"}</span>
            </div>
          </div>
        </button>

        {user && (
          <>
            <button
              onClick={logout}
              className="inline-flex items-center justify-center rounded-md border border-gray-600 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-gray-300 hover:bg-gray-800 transition-colors"
            >
              <LogOut className="w-3 h-3 mr-1" />
              Sair
            </button>
            <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
          </>
        )}
      </div>
    </aside>
  );
};


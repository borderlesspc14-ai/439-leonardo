import React, { createContext, useContext, useState } from "react";

export type MainView = "dashboard" | "accounts" | "account";

interface MainViewContextValue {
  mainView: MainView;
  setMainView: (v: MainView) => void;
  selectedAccountId: string | null;
  selectedAccountEmail: string;
  setSelectedAccount: (id: string | null, email: string) => void;
}

const MainViewContext = createContext<MainViewContextValue | undefined>(undefined);

export const MainViewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mainView, setMainView] = useState<MainView>("dashboard");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedAccountEmail, setSelectedAccountEmail] = useState("");

  const setSelectedAccount = (id: string | null, email: string) => {
    setSelectedAccountId(id);
    setSelectedAccountEmail(email);
    if (id) setMainView("account");
  };

  return (
    <MainViewContext.Provider
      value={{
        mainView,
        setMainView,
        selectedAccountId,
        selectedAccountEmail,
        setSelectedAccount,
      }}
    >
      {children}
    </MainViewContext.Provider>
  );
};

export const useMainView = (): MainViewContextValue => {
  const ctx = useContext(MainViewContext);
  if (!ctx) throw new Error("useMainView must be used within MainViewProvider");
  return ctx;
};

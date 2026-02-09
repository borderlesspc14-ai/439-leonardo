import React, { createContext, useContext, useEffect, useState } from "react";
import { db } from "../firebase";
import {
  addDoc,
  collection,
  deleteField,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";

export type UserRole = "MASTER" | "OPERATOR" | "CLIENT";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  /** Nome fantasia exibido no painel (opcional). */
  displayName?: string;
  /** Foto do perfil em base64 (opcional). */
  photoBase64?: string;
}

interface AuthContextValue {
  user: AppUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
  }) => Promise<void>;
  logout: () => void;
  requestPasswordReset: (email: string) => Promise<void>;
  updateProfile: (userId: string, data: { displayName?: string | null; photoBase64?: string | null }) => Promise<void>;
}

const STORAGE_KEY = "minimal-dashboard-auth";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type UserDocument = {
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  displayName?: string;
  photoBase64?: string;
};

const seedUsers: Array<Omit<UserDocument, "password"> & { password: string }> =
  [
    {
      name: "Master Admin",
      email: "master@demo.com",
      role: "MASTER",
      password: "master",
    },
    {
      name: "Op. João",
      email: "operator@demo.com",
      role: "OPERATOR",
      password: "operator",
    },
    {
      name: "Cliente Ana",
      email: "client@demo.com",
      role: "CLIENT",
      password: "client",
    },
  ];

const normalizeEmail = (email: string): string =>
  email.trim().toLowerCase();

async function ensureSeedUsers() {
  const usersRef = collection(db, "users");
  const emails = seedUsers.map((u) => u.email);

  const existingSnap = await getDocs(
    query(usersRef, where("email", "in", emails))
  );
  const existingEmails = new Set(
    existingSnap.docs.map((d) => (d.data() as UserDocument).email)
  );

  const missing = seedUsers.filter((u) => !existingEmails.has(u.email));

  await Promise.all(
    missing.map((u) =>
      addDoc(usersRef, {
        name: u.name,
        email: u.email,
        role: u.role,
        password: u.password,
      })
    )
  );
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as AppUser;
      setUser(parsed);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (user) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const login = async (email: string, password: string) => {
    const normalizedEmail = normalizeEmail(email);
    const usersRef = collection(db, "users");

    // Garante que usuários demo existam no banco (persistentes)
    await ensureSeedUsers();

    const snap = await getDocs(
      query(usersRef, where("email", "==", normalizedEmail))
    );

    if (snap.empty) {
      throw new Error("Usuário não encontrado.");
    }

    const docSnap = snap.docs[0];
    const data = docSnap.data() as UserDocument;

    // Validação simples de senha se existir.
    if (data.password && data.password !== password) {
      throw new Error("Senha inválida.");
    }

    const appUser: AppUser = {
      id: docSnap.id,
      name: data.name,
      email: data.email,
      role: data.role,
      displayName: data.displayName,
      photoBase64: data.photoBase64,
    };

    setUser(appUser);
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
  }) => {
    if (data.role === "MASTER") {
      throw new Error("A conta MASTER é fixa e não pode ser criada via cadastro.");
    }
    const normalizedEmail = normalizeEmail(data.email);
    const usersRef = collection(db, "users");

    const existsSnap = await getDocs(
      query(usersRef, where("email", "==", normalizedEmail))
    );
    if (!existsSnap.empty) {
      throw new Error("Já existe um usuário com este e-mail.");
    }

    const docRef = await addDoc(usersRef, {
      name: data.name,
      email: normalizedEmail,
      role: data.role,
      password: data.password,
    } satisfies UserDocument);

    const appUser: AppUser = {
      id: docRef.id,
      name: data.name,
      email: normalizedEmail,
      role: data.role,
    };

    setUser(appUser);
  };

  const updateProfile = async (
    userId: string,
    data: { displayName?: string | null; photoBase64?: string | null }
  ) => {
    const usersRef = doc(db, "users", userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {};
    if (data.displayName !== undefined) {
      updates.displayName = data.displayName === null || data.displayName === "" ? deleteField() : data.displayName;
    }
    if (data.photoBase64 !== undefined) {
      updates.photoBase64 = data.photoBase64 === null || data.photoBase64 === "" ? deleteField() : data.photoBase64;
    }
    if (Object.keys(updates).length === 0) return;
    await updateDoc(usersRef, updates);
    if (user && user.id === userId) {
      const next: AppUser = { ...user };
      if (data.displayName !== undefined) {
        next.displayName = data.displayName === null || data.displayName === "" ? undefined : data.displayName;
      }
      if (data.photoBase64 !== undefined) {
        next.photoBase64 = data.photoBase64 === null || data.photoBase64 === "" ? undefined : data.photoBase64;
      }
      setUser(next);
    }
  };

  const logout = () => {
    setUser(null);
  };

  const requestPasswordReset = async (email: string) => {
    const normalizedEmail = normalizeEmail(email);
    const resetsRef = collection(db, "password-resets");
    await addDoc(resetsRef, {
      email: normalizedEmail,
      requestedAt: new Date().toISOString(),
    });
  };

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    requestPasswordReset,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return ctx;
};


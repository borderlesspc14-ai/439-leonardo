import React, { useState } from "react";
import type { AuthView } from "../router/Router";
import { useAuth } from "../auth/AuthContext";
import type { UserRole } from "../auth/AuthContext";
import { Input } from "../components/Input";
import { Button } from "../components/Button";

interface RegisterPageProps {
  onNavigate: (view: AuthView) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate }) => {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("CLIENT");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register({ name, email, password, role });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white text-black">
      <div className="w-full max-w-sm border border-border rounded-xl bg-white px-6 py-6 shadow-xl">
        <div className="mb-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-black">
            Painel Operacional
          </p>
          <h1 className="mt-1 text-lg font-semibold text-black">
            Criar nova conta
          </h1>
          <p className="mt-1 text-xs text-black">
            Defina o nível de acesso. A conta MASTER é única e não pode ser criada aqui.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="E-mail"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Senha"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <label className="block text-xs text-black space-y-1">
            <span className="tracking-[0.16em] uppercase">Nível de acesso</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full rounded-md bg-white border border-border px-3 py-2 text-sm text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
            >
              <option value="CLIENT">Client (somente leitura)</option>
              <option value="OPERATOR">Operator (produtos + status)</option>
            </select>
          </label>

          {error && (
            <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-[11px] text-red-800">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full justify-center"
          >
            {loading ? "Criando..." : "Criar conta"}
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-between text-[11px] text-black">
          <button
            type="button"
            className="underline-offset-4 hover:underline"
            onClick={() => onNavigate("login")}
          >
            Já possui conta?
          </button>
        </div>
      </div>
    </div>
  );
};


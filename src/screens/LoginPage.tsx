import React, { useState } from "react";
import type { AuthView } from "../router/Router";
import { useAuth } from "../auth/AuthContext";
import { Input } from "../components/Input";
import { Button } from "../components/Button";

interface LoginPageProps {
  onNavigate: (view: AuthView) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
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
            Painel de controle
          </p>
          <h1 className="mt-1 text-lg font-semibold text-black">
            Acessar conta
          </h1>
          <p className="mt-1 text-xs text-black">
            Informe suas credenciais para entrar no painel.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="E-mail"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Senha"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

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
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-between text-[11px] text-black">
          <button
            type="button"
            className="underline-offset-4 hover:underline"
            onClick={() => onNavigate("recover")}
          >
            Esqueceu a senha?
          </button>
          <button
            type="button"
            className="underline-offset-4 hover:underline"
            onClick={() => onNavigate("register")}
          >
            Criar conta
          </button>
        </div>
      </div>
    </div>
  );
};


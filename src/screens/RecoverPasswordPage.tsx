import React, { useState } from "react";
import type { AuthView } from "../router/Router";
import { useAuth } from "../auth/AuthContext";
import { Input } from "../components/Input";
import { Button } from "../components/Button";

interface RecoverPasswordPageProps {
  onNavigate: (view: AuthView) => void;
}

export const RecoverPasswordPage: React.FC<RecoverPasswordPageProps> = ({
  onNavigate,
}) => {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await requestPasswordReset(email);
    setLoading(false);
    setDone(true);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white text-black">
      <div className="w-full max-w-sm border border-border rounded-xl bg-white px-6 py-6 shadow-xl">
        <div className="mb-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-black">
            Recuperar acesso
          </p>
          <h1 className="mt-1 text-lg font-semibold text-black">
            Recuperação de senha
          </h1>
          <p className="mt-1 text-xs text-black">
            Informe seu e-mail para simular o envio de instruções de redefinição.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="E-mail"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {done && (
            <div className="rounded-md border border-border bg-gray-50 px-3 py-2 text-[11px] text-black">
              Se este e-mail existir, enviaremos instruções de recuperação.
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full justify-center"
          >
            {loading ? "Enviando..." : "Enviar instruções"}
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-between text-[11px] text-black">
          <button
            type="button"
            className="underline-offset-4 hover:underline"
            onClick={() => onNavigate("login")}
          >
            Voltar para login
          </button>
        </div>
      </div>
    </div>
  );
};


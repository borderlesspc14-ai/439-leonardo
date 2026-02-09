import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import { Modal } from "./Modal";
import { Input } from "./Input";
import { Button } from "./Button";
import { User, Camera } from "lucide-react";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") resolve(result);
      else reject(new Error("Leitura do arquivo falhou."));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ open, onClose }) => {
  const { user, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [photoBase64, setPhotoBase64] = useState<string | undefined>(user?.photoBase64);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && user) {
      setDisplayName(user.displayName ?? "");
      setPhotoBase64(user.photoBase64);
      setError(null);
    }
  }, [open, user?.displayName, user?.photoBase64]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Selecione uma imagem (JPG, PNG ou GIF).");
      return;
    }
    setError(null);
    try {
      const base64 = await fileToBase64(file);
      setPhotoBase64(base64);
    } catch {
      setError("Erro ao processar a imagem.");
    }
    e.target.value = "";
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile(user.id, {
        displayName: displayName.trim() || null,
        photoBase64: photoBase64 ?? null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoBase64(undefined);
  };

  if (!user) return null;

  return (
    <Modal
      open={open}
      title="Meu perfil"
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <label className="block w-20 h-20 rounded-full overflow-hidden border-2 border-border bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity">
              {photoBase64 ? (
                <img
                  src={photoBase64}
                  alt="Foto do perfil"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  <User className="w-10 h-10" />
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleFileChange}
              />
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-black text-white flex items-center justify-center shadow"
              title="Alterar foto"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>
          {photoBase64 && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="text-[10px] uppercase tracking-[0.16em] text-gray-600 hover:text-black"
            >
              Remover foto
            </button>
          )}
        </div>

        <Input
          label="Nome fantasia"
          placeholder="Ex.: Loja Central"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />

        {error && (
          <p className="text-[10px] text-red-600">{error}</p>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

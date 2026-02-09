import React from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ open, title, onClose, children }) => {
  if (!open) return null;

  return (
    <div className="fixed z-40 flex items-center justify-center p-4" style={{ inset: 0, width: '100vw', height: '100vh', minHeight: '100dvh' }}>
      <div
        className="fixed bg-black/30 backdrop-blur-sm"
        style={{ top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', minHeight: '100dvh' }}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-md max-h-[65vh] flex flex-col rounded-lg border border-border bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <h2 className="text-xs font-medium tracking-[0.16em] uppercase text-black">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 text-black"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-4 py-4 text-sm text-black overflow-y-auto flex-1 min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
};


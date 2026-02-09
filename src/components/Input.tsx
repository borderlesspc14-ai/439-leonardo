import React from "react";
import clsx from "clsx";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className, ...props }) => {
  return (
    <label className="block text-xs text-black space-y-1">
      {label && <span className="tracking-[0.16em] uppercase">{label}</span>}
      <input
        className={clsx(
          "w-full rounded-md bg-white border border-border px-3 py-2 text-sm text-black placeholder:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40",
          className
        )}
        {...props}
      />
      {error && <span className="text-[10px] text-red-400">{error}</span>}
    </label>
  );
};


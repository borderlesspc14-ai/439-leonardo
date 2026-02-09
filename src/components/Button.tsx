import React from "react";
import clsx from "clsx";

type ButtonVariant = "primary" | "ghost" | "outline";
type ButtonSize = "sm" | "md";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const baseClasses =
  "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:ring-black disabled:opacity-50 disabled:cursor-not-allowed";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-foreground text-background hover:opacity-90 border border-border text-xs tracking-[0.16em] uppercase px-4 py-2",
  ghost:
    "bg-transparent text-black hover:bg-gray-100 border border-transparent text-xs tracking-[0.16em] uppercase px-3 py-1.5",
  outline:
    "bg-transparent text-black border border-border hover:bg-gray-100 text-xs tracking-[0.16em] uppercase px-3 py-1.5",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "text-[10px] px-2.5 py-1.5",
  md: "",
};

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  className,
  ...props
}) => {
  return (
    <button
      className={clsx(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      {...props}
    />
  );
};


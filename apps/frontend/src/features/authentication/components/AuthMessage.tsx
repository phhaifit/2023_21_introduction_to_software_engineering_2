import type { HTMLAttributes, ReactNode } from "react";

interface AuthMessageProps extends HTMLAttributes<HTMLDivElement> {
  variant: "error" | "success";
  children: ReactNode;
}

export function AuthMessage({ variant, children, className, ...messageProps }: AuthMessageProps) {
  const messageClassName = className
    ? `auth-message auth-message--${variant} ${className}`
    : `auth-message auth-message--${variant}`;

  return (
    <div
      {...messageProps}
      aria-live={variant === "success" ? "polite" : undefined}
      className={messageClassName}
      role={variant === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}

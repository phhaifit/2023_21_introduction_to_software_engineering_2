import type { ButtonHTMLAttributes } from "react";

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingLabel?: string;
}

export function AuthButton({
  children,
  className,
  disabled,
  loading = false,
  loadingLabel = "Loading",
  type = "button",
  ...buttonProps
}: AuthButtonProps) {
  const buttonClassName = className ? `auth-primary-button ${className}` : "auth-primary-button";

  return (
    <button
      {...buttonProps}
      aria-busy={loading ? "true" : undefined}
      className={buttonClassName}
      disabled={disabled || loading}
      type={type}
    >
      {loading ? loadingLabel : children}
    </button>
  );
}

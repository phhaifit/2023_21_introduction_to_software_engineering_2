import { useId } from "react";
import type { InputHTMLAttributes } from "react";

type EmailInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type"> & {
  id?: string;
  label: string;
  error?: string;
};

export function EmailInput({ id, label, error, required, ...inputProps }: EmailInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className="auth-field">
      <label htmlFor={inputId}>{label}</label>
      <input
        {...inputProps}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? "true" : undefined}
        id={inputId}
        required={required}
        type="email"
      />
      {error ? (
        <p className="auth-field__error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

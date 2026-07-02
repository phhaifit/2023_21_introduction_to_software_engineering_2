import { useId, useState } from "react";
import type { InputHTMLAttributes } from "react";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type"> & {
  id?: string;
  label: string;
  error?: string;
};

export function PasswordInput({ id, label, error, required, ...inputProps }: PasswordInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const [isVisible, setIsVisible] = useState(false);
  const toggleLabel = isVisible ? "Hide password" : "Show password";

  return (
    <div className="auth-field">
      <label htmlFor={inputId}>{label}</label>
      <div className="auth-password-control">
        <input
          {...inputProps}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? "true" : undefined}
          className="auth-input--password"
          id={inputId}
          required={required}
          type={isVisible ? "text" : "password"}
        />
        <button
          aria-controls={inputId}
          aria-label={toggleLabel}
          aria-pressed={isVisible}
          className="auth-password-control__toggle"
          onClick={() => setIsVisible((currentValue) => !currentValue)}
          title={toggleLabel}
          type="button"
        >
          <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
            {isVisible ? (
              <>
                <path d="M3 3l18 18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                <path d="M10.7 5.2A9.9 9.9 0 0 1 12 5c5 0 8.5 4.5 9.5 6.4.2.4.2.8 0 1.2a16 16 0 0 1-2.9 3.6M6.5 6.5a16.6 16.6 0 0 0-4 4.9c-.2.4-.2.8 0 1.2C3.5 14.5 7 19 12 19c1.5 0 2.8-.4 4-1" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </>
            ) : (
              <>
                <path d="M2.5 11.4C3.5 9.5 7 5 12 5s8.5 4.5 9.5 6.4c.2.4.2.8 0 1.2C20.5 14.5 17 19 12 19s-8.5-4.5-9.5-6.4a1.3 1.3 0 0 1 0-1.2Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
              </>
            )}
          </svg>
        </button>
      </div>
      {error ? (
        <p className="auth-field__error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

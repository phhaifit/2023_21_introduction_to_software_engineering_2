import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { AUTH_ERROR_CODES } from "@ai-agent-platform/shared";

import { AuthButton, AuthCard, AuthMessage, EmailInput, PasswordInput } from "../components";
import { AUTHENTICATION_ERROR_MESSAGES } from "../constants/authentication.constants";
import {
  validateLoginForm,
  type LoginFormPayload,
  type LoginFormValues,
  type LoginValidationErrors
} from "../utils/auth-validator";

export type LoginSubmitHandler = (input: LoginFormPayload) => Promise<void>;

interface LoginLocationState {
  message?: unknown;
}

interface LoginPageProps {
  onLogin?: LoginSubmitHandler;
  onLoginSuccess?: () => void;
}

interface AuthErrorLike {
  code?: unknown;
}

const initialFormValues: LoginFormValues = {
  email: "",
  password: ""
};

const LOGIN_FAILED_MESSAGE = "We could not log you in. Please try again.";
const LOGIN_UNAVAILABLE_MESSAGE = "Login is not available yet. Please try again later.";

export function LoginPage({ onLogin, onLoginSuccess }: LoginPageProps) {
  const location = useLocation();
  const locationState = location.state as LoginLocationState | null;
  const registerSuccessMessage = typeof locationState?.message === "string" ? locationState.message : "";
  const [formValues, setFormValues] = useState<LoginFormValues>(initialFormValues);
  const [fieldErrors, setFieldErrors] = useState<LoginValidationErrors>({});
  const [formMessage, setFormMessage] = useState(registerSuccessMessage);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messageVariant = formMessage === registerSuccessMessage && registerSuccessMessage ? "success" : "error";

  function updateField(field: keyof LoginFormValues) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setFormValues((currentValues) => ({
        ...currentValues,
        [field]: event.target.value
      }));
      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        [field]: undefined
      }));
      setFormMessage("");
    };
  }

  async function submitLoginForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const validation = validateLoginForm(formValues);
    setFieldErrors(validation.errors);
    setFormMessage("");

    if (!validation.isValid || !validation.payload) {
      return;
    }

    if (!onLogin) {
      setFormMessage(LOGIN_UNAVAILABLE_MESSAGE);
      return;
    }

    setIsSubmitting(true);

    try {
      await onLogin(validation.payload);
      onLoginSuccess?.();
    } catch (error) {
      setFormMessage(toSafeLoginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard
      eyebrow="WELCOME"
      footer={
        <>
          Do not have an account? <Link to="/register">Register</Link>
        </>
      }
      subtitle="Enter your credentials to continue to the platform."
      title="Login to your account"
    >
      <form className="auth-form" noValidate onSubmit={(event) => void submitLoginForm(event)}>
        {formMessage ? <AuthMessage variant={messageVariant}>{formMessage}</AuthMessage> : null}

        <EmailInput
          autoComplete="email"
          disabled={isSubmitting}
          error={fieldErrors.email}
          label="Email Address"
          name="email"
          onChange={updateField("email")}
          required
          value={formValues.email}
        />
        <PasswordInput
          autoComplete="current-password"
          disabled={isSubmitting}
          error={fieldErrors.password}
          label="Password"
          name="password"
          onChange={updateField("password")}
          required
          value={formValues.password}
        />
        <AuthButton loading={isSubmitting} loadingLabel="Logging in..." type="submit">
          Login
        </AuthButton>
      </form>
    </AuthCard>
  );
}

function toSafeLoginErrorMessage(error: unknown): string {
  const code = (error as AuthErrorLike | null)?.code;

  if (code === AUTH_ERROR_CODES.INVALID_CREDENTIALS) {
    return AUTHENTICATION_ERROR_MESSAGES.INVALID_CREDENTIALS;
  }

  if (code === AUTH_ERROR_CODES.ACCOUNT_DISABLED || code === AUTH_ERROR_CODES.ACCOUNT_LOCKED) {
    return AUTHENTICATION_ERROR_MESSAGES.ACCOUNT_DISABLED;
  }

  if (code === AUTH_ERROR_CODES.INVALID_INPUT) {
    return AUTHENTICATION_ERROR_MESSAGES.INVALID_INPUT;
  }

  return LOGIN_FAILED_MESSAGE;
}

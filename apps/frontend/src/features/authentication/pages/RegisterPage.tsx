import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AUTH_ERROR_CODES } from "@ai-agent-platform/shared";

import { AuthButton, AuthCard, AuthMessage, EmailInput, PasswordInput } from "../components";
import { AUTHENTICATION_ERROR_MESSAGES } from "../constants/authentication.constants";
import {
  validateRegisterForm,
  type RegisterFormPayload,
  type RegisterFormValues,
  type RegisterValidationErrors
} from "../utils/auth-validator";

export type RegisterSubmitHandler = (input: RegisterFormPayload) => Promise<void>;

interface RegisterPageProps {
  onRegister?: RegisterSubmitHandler;
}

interface AuthErrorLike {
  code?: unknown;
}

const initialFormValues: RegisterFormValues = {
  email: "",
  password: "",
  confirmPassword: ""
};

const REGISTER_FAILED_MESSAGE = "We could not create your account. Please try again.";
const REGISTER_UNAVAILABLE_MESSAGE = "Registration is not available yet. Please try again later.";
const REGISTER_SUCCESS_MESSAGE = "Account created successfully. Please log in.";

export function RegisterPage({ onRegister }: RegisterPageProps) {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState<RegisterFormValues>(initialFormValues);
  const [fieldErrors, setFieldErrors] = useState<RegisterValidationErrors>({});
  const [formMessage, setFormMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field: keyof RegisterFormValues) {
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

  async function submitRegisterForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const validation = validateRegisterForm(formValues);
    setFieldErrors(validation.errors);
    setFormMessage("");

    if (!validation.isValid || !validation.payload) {
      return;
    }

    if (!onRegister) {
      setFormMessage(REGISTER_UNAVAILABLE_MESSAGE);
      return;
    }

    setIsSubmitting(true);

    try {
      await onRegister(validation.payload);
      setFormMessage(REGISTER_SUCCESS_MESSAGE);
      setIsSubmitting(false);
      navigate("/login", {
        state: {
          message: REGISTER_SUCCESS_MESSAGE
        }
      });
    } catch (error) {
      setFormMessage(toSafeRegisterErrorMessage(error));
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard
      eyebrow="GET STARTED"
      footer={
        <>
          Already have an account? <Link to="/login">Login</Link>
        </>
      }
      subtitle="Fill in the information below to register."
      title="Create your account"
    >
      <form className="auth-form" noValidate onSubmit={(event) => void submitRegisterForm(event)}>
        {formMessage ? (
          <AuthMessage variant={formMessage === REGISTER_SUCCESS_MESSAGE ? "success" : "error"}>
            {formMessage}
          </AuthMessage>
        ) : null}

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
          autoComplete="new-password"
          disabled={isSubmitting}
          error={fieldErrors.password}
          label="Password"
          name="password"
          onChange={updateField("password")}
          required
          value={formValues.password}
        />
        <PasswordInput
          autoComplete="new-password"
          disabled={isSubmitting}
          error={fieldErrors.confirmPassword}
          label="Confirm Password"
          name="confirmPassword"
          onChange={updateField("confirmPassword")}
          required
          value={formValues.confirmPassword}
        />
        <AuthButton loading={isSubmitting} loadingLabel="Creating account..." type="submit">
          Create Account
        </AuthButton>
      </form>
    </AuthCard>
  );
}

function toSafeRegisterErrorMessage(error: unknown): string {
  const code = (error as AuthErrorLike | null)?.code;

  if (code === AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS) {
    return AUTHENTICATION_ERROR_MESSAGES.EMAIL_ALREADY_EXISTS;
  }

  if (code === AUTH_ERROR_CODES.INVALID_INPUT) {
    return AUTHENTICATION_ERROR_MESSAGES.INVALID_INPUT;
  }

  return REGISTER_FAILED_MESSAGE;
}

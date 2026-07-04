export interface RegisterFormValues {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterFormPayload {
  email: string;
  password: string;
}

export interface RegisterValidationErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export interface RegisterValidationResult {
  isValid: boolean;
  payload?: RegisterFormPayload;
  errors: RegisterValidationErrors;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export const REGISTER_VALIDATION_MESSAGES = {
  emailRequired: "Email is required.",
  emailInvalid: "Enter a valid email address.",
  passwordRequired: "Password is required.",
  passwordWeak: "Password must be at least 8 characters and include uppercase, lowercase, and a number.",
  confirmPasswordRequired: "Confirm password is required.",
  confirmPasswordMismatch: "Passwords do not match."
} as const;

export function validateRegisterForm(values: RegisterFormValues): RegisterValidationResult {
  const normalizedEmail = normalizeEmail(values.email);
  const errors: RegisterValidationErrors = {};

  if (!normalizedEmail) {
    errors.email = REGISTER_VALIDATION_MESSAGES.emailRequired;
  } else if (!EMAIL_PATTERN.test(normalizedEmail)) {
    errors.email = REGISTER_VALIDATION_MESSAGES.emailInvalid;
  }

  if (!values.password) {
    errors.password = REGISTER_VALIDATION_MESSAGES.passwordRequired;
  } else if (!isStrongPassword(values.password)) {
    errors.password = REGISTER_VALIDATION_MESSAGES.passwordWeak;
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = REGISTER_VALIDATION_MESSAGES.confirmPasswordRequired;
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = REGISTER_VALIDATION_MESSAGES.confirmPasswordMismatch;
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    payload: isValid
      ? {
          email: normalizedEmail,
          password: values.password
        }
      : undefined
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isStrongPassword(password: string): boolean {
  return (
    password.length >= MIN_PASSWORD_LENGTH &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password)
  );
}

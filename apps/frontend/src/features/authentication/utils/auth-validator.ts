export interface RegisterFormValues {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterFormPayload {
  email: string;
  password: string;
}

export interface LoginFormValues {
  email: string;
  password: string;
}

export interface LoginFormPayload {
  email: string;
  password: string;
}

export interface RegisterValidationErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export interface LoginValidationErrors {
  email?: string;
  password?: string;
}

export interface RegisterValidationResult {
  isValid: boolean;
  payload?: RegisterFormPayload;
  errors: RegisterValidationErrors;
}

export interface LoginValidationResult {
  isValid: boolean;
  payload?: LoginFormPayload;
  errors: LoginValidationErrors;
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

export const LOGIN_VALIDATION_MESSAGES = {
  emailRequired: "Email is required.",
  emailInvalid: "Enter a valid email address.",
  passwordRequired: "Password is required."
} as const;

export function validateRegisterForm(values: RegisterFormValues): RegisterValidationResult {
  const normalizedEmail = normalizeEmail(values.email);
  const errors: RegisterValidationErrors = {};

  errors.email = validateRegisterField("email", values);
  errors.password = validateRegisterField("password", values);
  errors.confirmPassword = validateRegisterField("confirmPassword", values);
  removeEmptyErrors(errors);

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

export function validateRegisterField(field: keyof RegisterFormValues, values: RegisterFormValues): string | undefined {
  if (field === "email") {
    const normalizedEmail = normalizeEmail(values.email);

    if (!normalizedEmail) {
      return REGISTER_VALIDATION_MESSAGES.emailRequired;
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      return REGISTER_VALIDATION_MESSAGES.emailInvalid;
    }

    return undefined;
  }

  if (field === "password") {
    if (!values.password) {
      return REGISTER_VALIDATION_MESSAGES.passwordRequired;
    }

    if (!isStrongPassword(values.password)) {
      return REGISTER_VALIDATION_MESSAGES.passwordWeak;
    }

    return undefined;
  }

  if (!values.confirmPassword) {
    return REGISTER_VALIDATION_MESSAGES.confirmPasswordRequired;
  }

  if (values.confirmPassword !== values.password) {
    return REGISTER_VALIDATION_MESSAGES.confirmPasswordMismatch;
  }

  return undefined;
}

export function validateLoginForm(values: LoginFormValues): LoginValidationResult {
  const normalizedEmail = normalizeEmail(values.email);
  const errors: LoginValidationErrors = {};

  errors.email = validateLoginField("email", values);
  errors.password = validateLoginField("password", values);
  removeEmptyErrors(errors);

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

export function validateLoginField(field: keyof LoginFormValues, values: LoginFormValues): string | undefined {
  if (field === "email") {
    const normalizedEmail = normalizeEmail(values.email);

    if (!normalizedEmail) {
      return LOGIN_VALIDATION_MESSAGES.emailRequired;
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      return LOGIN_VALIDATION_MESSAGES.emailInvalid;
    }

    return undefined;
  }

  if (!values.password) {
    return LOGIN_VALIDATION_MESSAGES.passwordRequired;
  }

  return undefined;
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

function removeEmptyErrors(errors: RegisterValidationErrors | LoginValidationErrors): void {
  for (const field of Object.keys(errors) as Array<keyof typeof errors>) {
    if (!errors[field]) {
      delete errors[field];
    }
  }
}

import { Link, useLocation } from "react-router-dom";

import { AuthButton, AuthCard, AuthMessage, EmailInput, PasswordInput } from "../components";

interface LoginLocationState {
  message?: unknown;
}

export function LoginPage() {
  const location = useLocation();
  const locationState = location.state as LoginLocationState | null;
  const successMessage = typeof locationState?.message === "string" ? locationState.message : "";

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
      {successMessage ? <AuthMessage variant="success">{successMessage}</AuthMessage> : null}
      <EmailInput autoComplete="email" label="Email Address" name="email" />
      <PasswordInput autoComplete="current-password" label="Password" name="password" />
      <AuthButton>Login</AuthButton>
    </AuthCard>
  );
}

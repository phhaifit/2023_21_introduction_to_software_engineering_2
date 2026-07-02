import { Link } from "react-router-dom";

import { AuthButton, AuthCard, EmailInput, PasswordInput } from "../components";

export function LoginPage() {
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
      <EmailInput autoComplete="email" label="Email Address" name="email" />
      <PasswordInput autoComplete="current-password" label="Password" name="password" />
      <AuthButton>Login</AuthButton>
    </AuthCard>
  );
}

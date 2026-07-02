import { Link } from "react-router-dom";

import { AuthButton, AuthCard, EmailInput, PasswordInput } from "../components";

export function RegisterPage() {
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
      <EmailInput label="Email Address" name="email" />
      <PasswordInput autoComplete="new-password" label="Password" name="password" />
      <PasswordInput
        autoComplete="new-password"
        label="Confirm Password"
        name="confirmPassword"
      />
      <AuthButton>Register</AuthButton>
    </AuthCard>
  );
}

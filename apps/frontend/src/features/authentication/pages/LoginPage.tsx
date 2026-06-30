import { Link } from "react-router-dom";

export function LoginPage() {
  return (
    <section className="auth-page" aria-labelledby="login-title">
      <div className="auth-page__header">
        <p className="auth-page__eyebrow">WELCOME</p>
        <h1 id="login-title">Login to your account</h1>
        <p>Enter your credentials to continue to the platform.</p>
      </div>

      <div className="auth-form-preview" aria-label="Login form preview">
        <label className="auth-field">
          <span>Email Address</span>
          <input type="email" aria-label="Email Address" disabled />
        </label>

        <label className="auth-field">
          <span>Password</span>
          <input type="password" aria-label="Password" disabled />
        </label>

        <button className="auth-primary-button" type="button" disabled>
          Login
        </button>
      </div>

      <p className="auth-navigation">
        Do not have an account? <Link to="/register">Register</Link>
      </p>
    </section>
  );
}

import { Link } from "react-router-dom";

export function RegisterPage() {
  return (
    <section className="auth-page" aria-labelledby="register-title">
      <div className="auth-page__header">
        <p className="auth-page__eyebrow">GET STARTED</p>
        <h1 id="register-title">Create your account</h1>
        <p>Fill in the information below to register.</p>
      </div>

      <div className="auth-form-preview" aria-label="Registration form preview">
        <label className="auth-field">
          <span>Email Address</span>
          <input type="email" aria-label="Email Address" disabled />
        </label>

        <label className="auth-field">
          <span>Password</span>
          <input type="password" aria-label="Password" disabled />
        </label>

        <label className="auth-field">
          <span>Confirm Password</span>
          <input type="password" aria-label="Confirm Password" disabled />
        </label>

        <button className="auth-primary-button" type="button" disabled>
          Register
        </button>
      </div>

      <p className="auth-navigation">
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </section>
  );
}

import { useId } from "react";
import type { ReactNode } from "react";

import "./authentication-components.css";

interface AuthCardProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function AuthCard({ eyebrow, title, subtitle, children, footer, className }: AuthCardProps) {
  const cardClassName = className ? `auth-card ${className}` : "auth-card";
  const titleId = useId();

  return (
    <section className={cardClassName} aria-labelledby={titleId}>
      <div className="auth-card__header">
        <p className="auth-card__eyebrow">{eyebrow}</p>
        <h1 id={titleId}>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <div className="auth-card__content">{children}</div>

      {footer ? <div className="auth-card__footer">{footer}</div> : null}
    </section>
  );
}

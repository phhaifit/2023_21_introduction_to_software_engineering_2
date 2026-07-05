import { Suspense, useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../authentication/context/AuthContext";
import {
  protectedAppNavigationItems,
  type ProtectedAppNavigationIcon
} from "../navigation/protectedApp.navigation";
import "../styles/protected-app.css";

const SIDEBAR_COLLAPSED_STORAGE_KEY = "ai-agent-platform.ui.sidebar-collapsed";

const SECTION_LABELS = [
  ["/app/admin/subscriptions", "Admin Subscriptions"],
  ["/app/subscription/plans", "Plans"],
  ["/app/subscription/checkout", "Checkout"],
  ["/app/subscription/payments", "Payment Result"],
  ["/app/subscription/mock-payment", "Mock Payment"],
  ["/app/subscription", "My Subscription"],
  ["/app/agents", "Agents"],
  ["/app/workspaces", "Workspaces"],
  ["/app/workflows", "Workflows"],
  ["/app", "Dashboard"]
] as const;

function readInitialSidebarCollapsed(): boolean {
  try {
    return window.sessionStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function writeSidebarCollapsed(value: boolean): void {
  try {
    window.sessionStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(value));
  } catch {
    return;
  }
}

function isActive(pathname: string, path: string): boolean {
  if (path === "/app") {
    return pathname === path;
  }

  if (path === "/app/subscription/plans") {
    return pathname === path;
  }

  if (path === "/app/subscription") {
    return (
      pathname === path ||
      pathname.startsWith("/app/subscription/checkout") ||
      pathname.startsWith("/app/subscription/payments") ||
      pathname.startsWith("/app/subscription/mock-payment")
    );
  }

  return pathname === path || pathname.startsWith(`${path}/`);
}

function currentSection(pathname: string): string {
  return (
    SECTION_LABELS.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1] ??
    "Dashboard"
  );
}

export function ProtectedAppShell() {
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(readInitialSidebarCollapsed);
  const [accountOpen, setAccountOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const email = user?.email ?? "Authenticated user";

  useEffect(() => {
    if (!accountOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAccountOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountOpen]);

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);
    setAccountOpen(false);

    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  }

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      writeSidebarCollapsed(next);
      return next;
    });
  }

  return (
    <div className={`protected-app-shell${collapsed ? " protected-app-shell--sidebar-collapsed" : ""}`}>
      <header className="protected-app-topbar">
        <div className="protected-app-topbar__brand">
          <button
            className="protected-app-topbar__toggle"
            type="button"
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>

          <span className="protected-app-topbar__mark" aria-hidden="true">
            AI
          </span>
          <div className="protected-app-topbar__title">
            <p className="protected-app-topbar__eyebrow">AI Agent Platform for Enterprise</p>
            <h1>{currentSection(location.pathname)}</h1>
          </div>
        </div>

        <div className="protected-app-topbar__account" ref={accountMenuRef}>
          <button
            className="protected-app-profile-button"
            type="button"
            onClick={() => setAccountOpen((value) => !value)}
            aria-expanded={accountOpen}
            aria-haspopup="menu"
            title={email}
          >
            <span className="protected-app-profile-button__avatar" aria-hidden="true">
              {email.trim().charAt(0).toUpperCase() || "A"}
            </span>
            <span className="protected-app-profile-button__label">Profile</span>
            <span className="protected-app-profile-button__chevron" aria-hidden="true" />
          </button>

          {accountOpen ? (
            <div className="protected-app-profile-menu" role="menu">
              <p>Account</p>
              <strong>{email}</strong>
              <button type="button" onClick={handleLogout} disabled={loggingOut} role="menuitem">
                {loggingOut ? "Signing out..." : "Log out"}
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <div className="protected-app-body">
        <aside className="protected-app-sidebar" aria-label="Protected application navigation">
          <nav className="protected-app-nav" aria-label="Application sections">
            {protectedAppNavigationItems.map((item) => {
              const content = (
                <>
                  <span className="protected-app-nav__marker" aria-hidden="true">
                    <NavigationIcon icon={item.icon} />
                  </span>
                  <span className="protected-app-nav__text">{item.label}</span>
                </>
              );

              return item.disabled ? (
                <button
                  key={item.label}
                  className="protected-app-nav__item protected-app-nav__item--disabled"
                  type="button"
                  aria-disabled="true"
                  title={`${item.label}: ${item.description}`}
                >
                  {content}
                </button>
              ) : (
                <NavLink
                  key={item.label}
                  className={() =>
                    `protected-app-nav__item${
                      isActive(location.pathname, item.path) ? " protected-app-nav__item--active" : ""
                    }`
                  }
                  to={item.path}
                  title={`${item.label}: ${item.description}`}
                >
                  {content}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        <main className="protected-app-content">
          <Suspense fallback={<div className="protected-app-route-loading">Loading module...</div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

function NavigationIcon({ icon }: { icon: ProtectedAppNavigationIcon }) {
  const paths: Record<ProtectedAppNavigationIcon, JSX.Element> = {
    dashboard: (
      <>
        <path d="M4 13h6V4H4v9Z" />
        <path d="M14 20h6v-9h-6v9Z" />
        <path d="M4 20h6v-3H4v3Z" />
        <path d="M14 7h6V4h-6v3Z" />
      </>
    ),
    workspace: (
      <>
        <path d="M4 7.5 12 4l8 3.5-8 3.5-8-3.5Z" />
        <path d="M4 12.5 12 16l8-3.5" />
        <path d="M4 16.5 12 20l8-3.5" />
      </>
    ),
    workflow: (
      <>
        <path d="M6 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
        <path d="M18 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
        <path d="M18 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
        <path d="M8 5h8M7.5 7.5 16.5 16.5" />
      </>
    ),
    plans: (
      <>
        <path d="M6 3h12l2 5H4l2-5Z" />
        <path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
        <path d="M9 13h6M9 17h4" />
      </>
    ),
    subscription: (
      <>
        <path d="M4 7h16v10H4z" />
        <path d="M4 10h16" />
        <path d="M8 15h4" />
      </>
    ),
    admin: (
      <>
        <path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z" />
        <path d="M9.5 12.5 11.5 14.5 15 10" />
      </>
    ),
    agents: (
      <>
        <path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M16 11a3 3 0 1 0 0-6" />
        <path d="M3 20a5 5 0 0 1 10 0" />
        <path d="M14 18a4 4 0 0 1 7 2" />
      </>
    )
  };

  return (
    <svg aria-hidden="true" className="protected-app-nav__icon" fill="none" viewBox="0 0 24 24">
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
        {paths[icon]}
      </g>
    </svg>
  );
}

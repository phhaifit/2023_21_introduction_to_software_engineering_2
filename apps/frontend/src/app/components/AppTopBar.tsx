import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../features/authentication/context/AuthContext";

import "./app-topbar.css";

interface AppTopBarProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
}

export function AppTopBar({ collapsed, onToggleSidebar }: AppTopBarProps) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const profileInitial = user?.email?.slice(0, 1).toUpperCase() ?? "U";

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    window.addEventListener("click", handleDocumentClick);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("click", handleDocumentClick);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      await logout();
    } catch {
      // AuthContext clears local auth state even when the backend logout request fails.
    } finally {
      setIsMenuOpen(false);
      navigate("/login", { replace: true });
    }
  }

  function openAccountSettings() {
    setIsMenuOpen(false);
    navigate("/app");
  }

  return (
    <header className="app-topbar">
      <div className="app-topbar-left">
        <button
          type="button"
          className="app-topbar-toggle"
          onClick={onToggleSidebar}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="app-topbar-toggle-icon" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>

        <div className="app-topbar-brand">
          <span className="app-topbar-brand-mark">AI</span>
          <span className="app-topbar-brand-name">AI Agent Platform for Enterprise</span>
        </div>
      </div>

      <div className="app-topbar-center" aria-hidden="true" />

      <div className="app-topbar-right" ref={menuRef}>
        <button
          type="button"
          className="app-topbar-profile-button"
          onClick={(event) => {
            event.stopPropagation();
            setIsMenuOpen((current) => !current);
          }}
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          aria-label="Profile menu"
        >
          <span className="app-topbar-profile-avatar" aria-hidden="true">{profileInitial}</span>
          <span className="app-topbar-profile-label">Profile</span>
        </button>

        {isMenuOpen ? (
          <div className="app-topbar-profile-menu" role="menu" aria-label="Profile options">
            <button type="button" role="menuitem" onClick={openAccountSettings}>
              Account
            </button>
            <button type="button" role="menuitem" onClick={() => void handleLogout()}>
              {isLoggingOut ? "Logging out..." : "Log out"}
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}

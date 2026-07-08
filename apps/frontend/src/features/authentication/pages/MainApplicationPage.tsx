import { useState } from "react";
import { AppSidebar } from "../../../app/components/AppSidebar";
import { AppTopBar } from "../../../app/components/AppTopBar";

import { useAuth } from "../context/AuthContext";

import "../styles/authentication.css";
import { TaskOrchestrationPanel } from "../../task-orchestration/components/TaskOrchestrationPanel";
import { mainApplicationNavigation } from "./mainApplication.navigation";

export function MainApplicationPage() {
  const { user } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className={isSidebarCollapsed ? "app-page-shell is-sidebar-collapsed" : "app-page-shell"}>
      <AppTopBar
        collapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed((current) => !current)}
      />
      <AppSidebar collapsed={isSidebarCollapsed} />

      <main className="app-page-content main-application-shell">
        <header className="main-application-header">
          <div>
            <p className="main-application-eyebrow">Account settings</p>
            <h1 id="main-title">Welcome back to the platform</h1>
          </div>
        </header>

        <TaskOrchestrationPanel />
        
        <section className="main-application-content" aria-labelledby="main-title">
          <div className="main-status-mark" aria-hidden="true">
            ✓
          </div>
          <div>
            <p className="main-application-eyebrow">Authenticated session</p>
            <h2>Your profile and access summary</h2>
            <p>Your access has been verified by the authentication service.</p>
            <p className="main-application-muted">
              This screen only shows public account information and logout controls.
            </p>

            <dl className="main-user-details" aria-label="Current user">
              <div>
                <dt>Email</dt>
                <dd>{user?.email ?? "Unavailable"}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{user?.status ?? "Unavailable"}</dd>
              </div>
              <div>
                <dt>User ID</dt>
                <dd>{user?.id ?? "Unavailable"}</dd>
              </div>
            </dl>
          </div>
        </section>
      </main>
    </div>
  );
}

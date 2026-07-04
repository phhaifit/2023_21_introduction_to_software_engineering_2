import { NavLink } from "react-router-dom";

import "./app-sidebar.css";

const NAV_ITEMS = [
  { to: "/app/agents", label: "My Agents" },
  { to: "/app/workflows", label: "Workflows" },
  { to: "/app/workspaces", label: "Workspaces" }
];

interface AppSidebarProps {
  collapsed: boolean;
}

export function AppSidebar({ collapsed }: AppSidebarProps) {
  return (
    <aside className={collapsed ? "app-sidebar is-collapsed" : "app-sidebar"}>
      <div className="app-sidebar-brand">
        <div className="app-sidebar-brand-mark">AI</div>
        <div>
          <p className="app-sidebar-brand-title">Agent Console</p>
          <p className="app-sidebar-brand-subtitle">Workspace Tools</p>
        </div>
      </div>

      <nav className="app-sidebar-nav" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              isActive ? "app-sidebar-link is-active" : "app-sidebar-link"
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

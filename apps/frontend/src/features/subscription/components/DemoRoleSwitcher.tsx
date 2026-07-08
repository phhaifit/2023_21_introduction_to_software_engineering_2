import { useState } from "react";

import {
  getStoredDemoRole,
  setStoredDemoRole,
  type DemoRole
} from "../services/demoRole";

function DemoRoleSwitcherControl() {
  const [role, setRole] = useState<DemoRole>(getStoredDemoRole);

  const changeRole = (nextRole: DemoRole) => {
    setStoredDemoRole(nextRole);
    setRole(nextRole);
    window.location.reload();
  };

  return (
    <div className="demo-role-switcher">
      <label>
        Demo role
        <select
          aria-label="Demo role"
          value={role}
          onChange={(event) => changeRole(event.target.value as DemoRole)}
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      <span className="demo-role-switcher__hint">Development only</span>
    </div>
  );
}

export function DemoRoleSwitcher() {
  if (!import.meta.env.DEV) {
    return null;
  }
  return <DemoRoleSwitcherControl />;
}

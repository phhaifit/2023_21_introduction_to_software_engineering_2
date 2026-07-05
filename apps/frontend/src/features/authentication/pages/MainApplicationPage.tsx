import "../styles/authentication.css";
import { TaskOrchestrationPanel } from "../../task-orchestration/components/TaskOrchestrationPanel";

export function MainApplicationPage() {
  return (
    <main className="main-application-shell">
      <header className="main-application-header">
        <div className="main-application-brand">
          <span className="main-application-brand__mark">AI</span>
          <span>AI Agent Platform for Enterprise</span>
        </div>

        <button className="logout-placeholder-button" type="button" disabled>
          Logout
        </button>
      </header>

      <TaskOrchestrationPanel />
    </main>
  );
}

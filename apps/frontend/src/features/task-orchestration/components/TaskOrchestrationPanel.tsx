import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { ExecutionTarget, OrchestratedTask, TaskRoutingMode, TaskConsole } from "@ai-agent-platform/shared";

import { fetchTaskConsole, submitTask } from "../api/taskOrchestrationApi";
import "./task-orchestration.css";

const routingModes: Array<{ value: TaskRoutingMode; label: string }> = [
  { value: "automatic", label: "Auto" },
  { value: "agent", label: "Agent" },
  { value: "workflow", label: "Workflow" },
  { value: "multi-agent", label: "Team" }
];

const emptyConsole: TaskConsole = {
  agents: [],
  workflows: [],
  tasks: [],
  metrics: {
    activeTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    successRate: 0
  }
};

function statusLabel(status: string) {
  return status.replace("-", " ");
}

function targetSummary(target: ExecutionTarget | undefined) {
  if (!target) {
    return "No target selected";
  }

  return `${target.name} (${target.status})`;
}

export function TaskOrchestrationPanel() {
  const [consoleData, setConsoleData] = useState<TaskConsole>(emptyConsole);
  const [prompt, setPrompt] = useState("");
  const [routingMode, setRoutingMode] = useState<TaskRoutingMode>("automatic");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [selectedWorkflowId, setSelectedWorkflowId] = useState("");
  const [selectedTask, setSelectedTask] = useState<OrchestratedTask | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  async function loadConsole() {
    setIsLoading(true);
    const data = await fetchTaskConsole();
    setConsoleData(data);
    setSelectedAgentId((current) => current || data.agents[0]?.id || "");
    setSelectedWorkflowId((current) => current || data.workflows[0]?.id || "");
    setSelectedTask((current) => current ?? data.tasks[0] ?? null);
    setIsLoading(false);
  }

  useEffect(() => {
    loadConsole().catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "Cannot load task orchestration data");
      setIsLoading(false);
    });
  }, []);

  const previewTarget = useMemo(() => {
    if (routingMode === "workflow") {
      return consoleData.workflows.find((workflow) => workflow.id === selectedWorkflowId);
    }

    if (routingMode === "agent") {
      return consoleData.agents.find((agent) => agent.id === selectedAgentId);
    }

    if (routingMode === "multi-agent") {
      return consoleData.agents.find((agent) => agent.capabilities.includes("multi-agent")) ?? consoleData.agents[0];
    }

    return consoleData.agents.find((agent) => agent.status === "online") ?? consoleData.agents[0];
  }, [consoleData.agents, consoleData.workflows, routingMode, selectedAgentId, selectedWorkflowId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const task = await submitTask({
        prompt,
        routingMode,
        targetId: routingMode === "workflow" ? selectedWorkflowId : routingMode === "agent" ? selectedAgentId : undefined
      });
      setPrompt("");
      setSelectedTask(task);
      await loadConsole();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Cannot submit task");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="task-orchestration" aria-labelledby="task-orchestration-title">
      <div className="task-orchestration__header">
        <div>
          <p className="task-orchestration__eyebrow">Task Management</p>
          <h1 id="task-orchestration-title">Work Intake and Orchestration</h1>
        </div>
        <button className="task-orchestration__refresh" type="button" onClick={() => loadConsole()}>
          Refresh
        </button>
      </div>

      <div className="task-metrics" aria-label="Task orchestration metrics">
        <Metric label="Active" value={consoleData.metrics.activeTasks} />
        <Metric label="Completed" value={consoleData.metrics.completedTasks} />
        <Metric label="Failed" value={consoleData.metrics.failedTasks} />
        <Metric label="Success" value={`${consoleData.metrics.successRate}%`} />
      </div>

      <div className="task-orchestration__grid">
        <form className="task-composer" onSubmit={handleSubmit}>
          <h2>Assign Work</h2>
          <label className="task-field">
            <span>Prompt</span>
            <textarea
              name="prompt"
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Describe the task that should be routed to an agent, workflow, or team."
              rows={5}
              value={prompt}
            />
          </label>

          <div className="routing-tabs" aria-label="Routing mode">
            {routingModes.map((mode) => (
              <button
                className={routingMode === mode.value ? "routing-tabs__item routing-tabs__item--active" : "routing-tabs__item"}
                key={mode.value}
                onClick={() => setRoutingMode(mode.value)}
                type="button"
              >
                {mode.label}
              </button>
            ))}
          </div>

          {routingMode === "agent" ? (
            <TargetSelect
              label="Execution Agent"
              onChange={setSelectedAgentId}
              targets={consoleData.agents}
              value={selectedAgentId}
            />
          ) : null}

          {routingMode === "workflow" ? (
            <TargetSelect
              label="Execution Workflow"
              onChange={setSelectedWorkflowId}
              targets={consoleData.workflows}
              value={selectedWorkflowId}
            />
          ) : null}

          <div className="routing-preview">
            <span>Routing Preview</span>
            <strong>{targetSummary(previewTarget)}</strong>
            <p>{routingMode === "multi-agent" ? "Shared context will be prepared for collaborating agents." : "The target will receive the prompt and return a normalized result."}</p>
          </div>

          {errorMessage ? <div className="task-error">{errorMessage}</div> : null}

          <button className="task-primary-button" disabled={isSubmitting || !prompt.trim()} type="submit">
            {isSubmitting ? "Submitting" : "Submit Task"}
          </button>
        </form>

        <section className="task-list" aria-label="Recent tasks">
          <h2>Recent Tasks</h2>
          {isLoading ? <p className="task-muted">Loading tasks...</p> : null}
          {consoleData.tasks.map((task) => (
            <button
              className={selectedTask?.id === task.id ? "task-list__row task-list__row--active" : "task-list__row"}
              key={task.id}
              onClick={() => setSelectedTask(task)}
              type="button"
            >
              <span>
                <strong>{task.prompt}</strong>
                <small>{task.targetName}</small>
              </span>
              <em>{statusLabel(task.status)}</em>
            </button>
          ))}
          {!isLoading && consoleData.tasks.length === 0 ? <p className="task-muted">No tasks have been submitted yet.</p> : null}
        </section>

        <section className="task-result" aria-label="Task result">
          <h2>Result</h2>
          {selectedTask ? (
            <>
              <div className="task-result__block">
                <span>Summary</span>
                <p>{selectedTask.resultSummary ?? selectedTask.error}</p>
              </div>
              <div className="task-result__block">
                <span>Output</span>
                <p>{selectedTask.result ?? selectedTask.error}</p>
              </div>
              {selectedTask.collaborationContext ? (
                <div className="task-result__block">
                  <span>Shared Context</span>
                  <p>{selectedTask.collaborationContext.participants.join(", ")}</p>
                </div>
              ) : null}
              <div className="task-audit">
                {selectedTask.auditLog.map((audit) => (
                  <div className="task-audit__item" key={audit.id}>
                    <strong>{audit.title}</strong>
                    <p>{audit.detail}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="task-muted">Submit or select a task to inspect the output.</p>
          )}
        </section>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="task-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TargetSelect({
  label,
  onChange,
  targets,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  targets: ExecutionTarget[];
  value: string;
}) {
  return (
    <label className="task-field">
      <span>{label}</span>
      <select onChange={(event) => onChange(event.target.value)} value={value}>
        {targets.map((target) => (
          <option key={target.id} value={target.id}>
            {target.name} - {target.status}
          </option>
        ))}
      </select>
    </label>
  );
}

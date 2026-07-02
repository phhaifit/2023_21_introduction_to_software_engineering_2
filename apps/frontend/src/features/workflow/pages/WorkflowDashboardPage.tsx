import { FormEvent, useEffect, useMemo, useState } from "react";

import type { CreateWorkflowInput, Workflow, WorkflowExecution, WorkflowStatus, WorkflowStep } from "@ai-agent-platform/shared";

import {
  createWorkflow,
  executeWorkflow,
  listWorkflowExecutions,
  listWorkflows,
  updateWorkflow
} from "../api/workflowApi";
import "../styles/workflow.css";

const AGENT_OPTIONS = [
  { id: "agent-research", name: "Research Agent" },
  { id: "agent-writing", name: "Writing Agent" },
  { id: "agent-review", name: "Review Agent" },
  { id: "agent-publish", name: "Publishing Agent" }
];

function createDefaultStep(order: number): WorkflowStep {
  const agent = AGENT_OPTIONS[Math.min(order - 1, AGENT_OPTIONS.length - 1)];

  return {
    id: `step-${order}`,
    name: `Step ${order}`,
    agentId: agent.id,
    agentName: agent.name,
    order,
    timeoutSeconds: 60,
    onFailure: "stop"
  };
}

function createDefaultForm(): CreateWorkflowInput {
  return {
    name: "Customer onboarding workflow",
    description: "Coordinate several AI agents to prepare onboarding material and review the final output.",
    status: "active",
    steps: [createDefaultStep(1), createDefaultStep(2), createDefaultStep(3)]
  };
}

function formatDate(value?: string) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function statusLabel(status: WorkflowStatus) {
  return status[0].toUpperCase() + status.slice(1);
}

export function WorkflowDashboardPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [form, setForm] = useState<CreateWorkflowInput>(createDefaultForm());
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | undefined>();
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [filter, setFilter] = useState<WorkflowStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("Ready to manage workflows.");

  const selectedWorkflow = useMemo(
    () => workflows.find((workflow) => workflow.id === selectedId),
    [selectedId, workflows]
  );

  const filteredWorkflows = useMemo(
    () => workflows.filter((workflow) => {
      const matchesStatus = filter === "all" || workflow.status === filter;
      const matchesSearch = workflow.name.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    }),
    [filter, search, workflows]
  );

  async function refreshWorkflows(nextSelectedId?: string) {
    const nextWorkflows = await listWorkflows();
    setWorkflows(nextWorkflows);

    if (nextWorkflows.length > 0) {
      setSelectedId(nextSelectedId ?? selectedId ?? nextWorkflows[0].id);
    }
  }

  useEffect(() => {
    setIsLoading(true);
    refreshWorkflows()
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Cannot load workflows"))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setExecutions([]);
      return;
    }

    listWorkflowExecutions(selectedId)
      .then(setExecutions)
      .catch(() => setExecutions([]));
  }, [selectedId]);

  function updateStep(index: number, patch: Partial<WorkflowStep>) {
    setForm((current) => ({
      ...current,
      steps: current.steps.map((step, stepIndex) => {
        if (stepIndex !== index) {
          return step;
        }

        const nextStep = { ...step, ...patch };
        const selectedAgent = AGENT_OPTIONS.find((agent) => agent.id === nextStep.agentId);
        return selectedAgent ? { ...nextStep, agentName: selectedAgent.name } : nextStep;
      })
    }));
  }

  function addStep() {
    setForm((current) => ({
      ...current,
      steps: [...current.steps, createDefaultStep(current.steps.length + 1)]
    }));
  }

  function removeStep(index: number) {
    setForm((current) => ({
      ...current,
      steps: current.steps
        .filter((_, stepIndex) => stepIndex !== index)
        .map((step, stepIndex) => ({ ...step, order: stepIndex + 1, id: `step-${stepIndex + 1}` }))
    }));
  }

  function startCreate() {
    setEditingWorkflowId(undefined);
    setForm(createDefaultForm());
    setMessage("Create mode is active. Fill the form and save the workflow.");
  }

  function startEdit(workflow: Workflow) {
    setEditingWorkflowId(workflow.id);
    setSelectedId(workflow.id);
    setForm({
      name: workflow.name,
      description: workflow.description,
      status: workflow.status,
      steps: workflow.steps
    });
    setMessage(`Editing ${workflow.name}.`);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    try {
      const savedWorkflow = editingWorkflowId
        ? await updateWorkflow(editingWorkflowId, form)
        : await createWorkflow(form);
      setMessage(editingWorkflowId ? "Workflow updated successfully." : "Workflow created successfully.");
      setEditingWorkflowId(savedWorkflow.id);
      await refreshWorkflows(savedWorkflow.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Cannot save workflow");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleExecute(workflow: Workflow) {
    const confirmed = window.confirm(`Run workflow '${workflow.name}' now?`);
    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    try {
      const execution = await executeWorkflow(workflow.id);
      setMessage(`Execution ${execution.id.slice(0, 8)} completed with status ${execution.status}.`);
      await refreshWorkflows(workflow.id);
      setExecutions(await listWorkflowExecutions(workflow.id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Cannot execute workflow");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="workflow-shell">
      <header className="workflow-header">
        <div>
          <p className="workflow-eyebrow">Workflow Management</p>
          <h1>AI Agent Workflow Console</h1>
          <p>Design, validate, execute, and monitor multi-agent workflows.</p>
        </div>
        <button className="workflow-primary-button" type="button" onClick={startCreate}>
          + Create workflow
        </button>
      </header>

      <section className="workflow-status-bar" role="status">
        <span>{isLoading ? "Loading..." : message}</span>
      </section>

      <section className="workflow-grid">
        <aside className="workflow-panel workflow-list-panel" aria-labelledby="workflow-list-title">
          <div className="workflow-panel-header">
            <div>
              <h2 id="workflow-list-title">Workflow List</h2>
              <p>{filteredWorkflows.length} item(s)</p>
            </div>
          </div>

          <div className="workflow-filters">
            <input
              aria-label="Search workflows"
              placeholder="Search by name"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select value={filter} onChange={(event) => setFilter(event.target.value as WorkflowStatus | "all")}>
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="workflow-list">
            {filteredWorkflows.map((workflow) => (
              <button
                className={`workflow-list-item ${workflow.id === selectedId ? "workflow-list-item--active" : ""}`}
                key={workflow.id}
                type="button"
                onClick={() => setSelectedId(workflow.id)}
              >
                <span>
                  <strong>{workflow.name}</strong>
                  <small>{workflow.steps.length} steps · Last run {formatDate(workflow.lastRunAt)}</small>
                </span>
                <span className={`workflow-pill workflow-pill--${workflow.status}`}>{statusLabel(workflow.status)}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="workflow-panel workflow-form-panel" aria-labelledby="workflow-form-title">
          <div className="workflow-panel-header">
            <div>
              <h2 id="workflow-form-title">{editingWorkflowId ? "Edit Workflow" : "Create Workflow"}</h2>
              <p>Validate sub-flow runs before saving.</p>
            </div>
          </div>

          <form className="workflow-form" onSubmit={handleSubmit}>
            <label>
              Name
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>
            <label>
              Description
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </label>
            <label>
              Status
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as WorkflowStatus })}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </label>

            <div className="workflow-steps-header">
              <strong>Steps builder</strong>
              <button type="button" onClick={addStep}>+ Add step</button>
            </div>

            {form.steps.map((step, index) => (
              <div className="workflow-step-card" key={`${step.id}-${index}`}>
                <span className="workflow-step-order">{index + 1}</span>
                <label>
                  Step name
                  <input value={step.name} onChange={(event) => updateStep(index, { name: event.target.value })} />
                </label>
                <label>
                  Agent
                  <select value={step.agentId} onChange={(event) => updateStep(index, { agentId: event.target.value })}>
                    {AGENT_OPTIONS.map((agent) => (
                      <option key={agent.id} value={agent.id}>{agent.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Timeout
                  <input
                    min={1}
                    type="number"
                    value={step.timeoutSeconds}
                    onChange={(event) => updateStep(index, { timeoutSeconds: Number(event.target.value) })}
                  />
                </label>
                <label>
                  On failure
                  <select value={step.onFailure} onChange={(event) => updateStep(index, { onFailure: event.target.value === "continue" ? "continue" : "stop" })}>
                    <option value="stop">Stop</option>
                    <option value="continue">Continue</option>
                  </select>
                </label>
                <button className="workflow-danger-button" type="button" onClick={() => removeStep(index)} disabled={form.steps.length === 1}>
                  Remove
                </button>
              </div>
            ))}

            <div className="workflow-actions">
              <button className="workflow-secondary-button" type="button" onClick={startCreate}>Reset</button>
              <button className="workflow-primary-button" type="submit" disabled={isLoading}>
                {editingWorkflowId ? "Save changes" : "Save workflow"}
              </button>
            </div>
          </form>
        </section>

        <section className="workflow-panel workflow-detail-panel" aria-labelledby="workflow-detail-title">
          <div className="workflow-panel-header">
            <div>
              <h2 id="workflow-detail-title">Workflow Detail</h2>
              <p>Metadata, execution history, and actions.</p>
            </div>
          </div>

          {selectedWorkflow ? (
            <>
              <div className="workflow-detail-card">
                <div>
                  <h3>{selectedWorkflow.name}</h3>
                  <p>{selectedWorkflow.description}</p>
                </div>
                <span className={`workflow-pill workflow-pill--${selectedWorkflow.status}`}>{statusLabel(selectedWorkflow.status)}</span>
              </div>

              <div className="workflow-metrics">
                <div><span>Steps</span><strong>{selectedWorkflow.steps.length}</strong></div>
                <div><span>Executions</span><strong>{selectedWorkflow.executionCount}</strong></div>
                <div><span>Updated</span><strong>{formatDate(selectedWorkflow.updatedAt)}</strong></div>
                <div><span>Last run</span><strong>{formatDate(selectedWorkflow.lastRunAt)}</strong></div>
              </div>

              <div className="workflow-detail-actions">
                <button className="workflow-secondary-button" type="button" onClick={() => startEdit(selectedWorkflow)}>Edit</button>
                <button className="workflow-primary-button" type="button" onClick={() => handleExecute(selectedWorkflow)} disabled={selectedWorkflow.status !== "active"}>
                  Run now
                </button>
              </div>

              <h3>Step sequence</h3>
              <ol className="workflow-step-list">
                {selectedWorkflow.steps.map((step) => (
                  <li key={step.id}>
                    <strong>{step.name}</strong>
                    <span>{step.agentName} · timeout {step.timeoutSeconds}s · on failure {step.onFailure}</span>
                  </li>
                ))}
              </ol>

              <h3>Execution History</h3>
              <div className="workflow-execution-list">
                {executions.length === 0 ? <p className="workflow-muted">No executions yet.</p> : null}
                {executions.map((execution) => (
                  <article className="workflow-execution-card" key={execution.id}>
                    <div>
                      <strong>{execution.id.slice(0, 8)}</strong>
                      <span>{formatDate(execution.startedAt)} · {execution.durationMs ?? 0}ms</span>
                    </div>
                    <span className={`workflow-pill workflow-pill--${execution.status}`}>{execution.status}</span>
                    <details>
                      <summary>View step logs</summary>
                      <ul>
                        {execution.logs.map((log) => (
                          <li key={`${execution.id}-${log.stepId}`}>{log.stepName}: {log.message}</li>
                        ))}
                      </ul>
                    </details>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <p className="workflow-muted">Create a workflow or select an item to view its detail.</p>
          )}
        </section>
      </section>
    </main>
  );
}

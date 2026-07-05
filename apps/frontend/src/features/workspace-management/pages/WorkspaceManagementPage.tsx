import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  WORKSPACE_RESOURCE_PROFILES,
  WORKSPACE_STATUSES,
  type CreateWorkspaceInput,
  type UpdateWorkspaceInput,
  type Workspace,
  type WorkspaceAction,
  type WorkspaceResourceProfile,
  type WorkspaceStatus,
  type WorkspaceValidationIssue
} from "@ai-agent-platform/shared";

import {
  WorkspaceApiValidationError,
  createWorkspace as createWorkspaceRequest,
  deleteWorkspace as deleteWorkspaceRequest,
  listWorkspaces,
  runWorkspaceAction,
  updateWorkspace as updateWorkspaceRequest
} from "../api/workspaceApi";
import "../styles/workspace.css";

type StatusFilter = "ALL" | WorkspaceStatus;

interface WorkspaceFormState {
  name: string;
  description: string;
  templateId: string;
  resourceProfile: WorkspaceResourceProfile;
  region: string;
}

const statusOptions: StatusFilter[] = ["ALL", ...WORKSPACE_STATUSES];
const resourceProfiles = WORKSPACE_RESOURCE_PROFILES;
const templates = [
  { id: "business-operations", label: "Business Operations" },
  { id: "hr-automation", label: "HR Automation" },
  { id: "finance-review", label: "Finance Review" }
];

const emptyFormState: WorkspaceFormState = {
  name: "",
  description: "",
  templateId: templates[0].id,
  resourceProfile: "Standard",
  region: "ap-southeast-1"
};

export function WorkspaceManagementPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [createForm, setCreateForm] = useState<WorkspaceFormState>(emptyFormState);
  const [editForm, setEditForm] = useState<WorkspaceFormState>(emptyFormState);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [openedWorkspace, setOpenedWorkspace] = useState<Workspace | null>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadWorkspaces() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const nextWorkspaces = await listWorkspaces();
      setWorkspaces(nextWorkspaces);
      setSelectedWorkspaceId((currentId) => currentId || nextWorkspaces[0]?.id || "");
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadWorkspaces();
  }, []);

  const filteredWorkspaces = useMemo(() => {
    return statusFilter === "ALL"
      ? workspaces
      : workspaces.filter((workspace) => workspace.status === statusFilter);
  }, [statusFilter, workspaces]);

  const selectedWorkspace =
    workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? filteredWorkspaces[0];

  const counts = {
    running: workspaces.filter((workspace) => workspace.status === "RUNNING").length,
    provisioning: workspaces.filter((workspace) => workspace.status === "PROVISIONING").length,
    failed: workspaces.filter((workspace) => workspace.status === "FAILED").length
  };

  async function createWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormErrors({});
    setErrorMessage("");
    setMessage("");

    try {
      const workspace = await createWorkspaceRequest(toCreateInput(createForm));
      setWorkspaces((current) => [workspace, ...current]);
      setSelectedWorkspaceId(workspace.id);
      setCreateForm(emptyFormState);
      setMessage("Workspace created and moved to provisioning.");
    } catch (error) {
      handleWorkspaceMutationError(error);
    }
  }

  async function updateWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedWorkspace) {
      return;
    }

    setFormErrors({});
    setErrorMessage("");
    setMessage("");

    try {
      const workspace = await updateWorkspaceRequest(selectedWorkspace.id, toUpdateInput(editForm));
      upsertWorkspace(workspace);
      setIsEditMode(false);
      setMessage("Workspace updated.");
    } catch (error) {
      handleWorkspaceMutationError(error);
    }
  }

  function handleWorkspaceMutationError(error: unknown) {
    if (error instanceof WorkspaceApiValidationError) {
      setFormErrors(toFieldErrors(error.details));
      return;
    }

    setErrorMessage(toErrorMessage(error));
  }

  async function runAction(action: WorkspaceAction) {
    if (!selectedWorkspace) {
      return;
    }

    const body =
      action === "fail"
        ? { reason: window.prompt("Fail reason", "Container runtime is not ready.") ?? "Provisioning failed." }
        : undefined;

    try {
      const workspace = await runWorkspaceAction(selectedWorkspace.id, action, body);
      upsertWorkspace(workspace);
      setMessage(`Workspace status changed to ${workspace.status}.`);
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    }
  }

  async function deleteWorkspace() {
    if (!selectedWorkspace || !window.confirm(`Delete workspace "${selectedWorkspace.name}"?`)) {
      return;
    }

    try {
      await deleteWorkspaceRequest(selectedWorkspace.id);
      setWorkspaces((current) => current.filter((workspace) => workspace.id !== selectedWorkspace.id));
      setSelectedWorkspaceId("");
      setOpenedWorkspace(null);
      setMessage("Workspace deleted.");
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    }
  }

  function startEditing(workspace: Workspace) {
    setEditForm(toFormState(workspace));
    setFormErrors({});
    setIsEditMode(true);
  }

  function upsertWorkspace(workspace: Workspace) {
    setWorkspaces((current) =>
      current.map((item) => (item.id === workspace.id ? workspace : item))
    );
    setOpenedWorkspace((current) => (current?.id === workspace.id ? workspace : current));
  }

  return (
    <div className="workspace-page">
        <section className="workspace-hero">
        <div>
          <p className="eyebrow">Workspace Management</p>
          <h1>Virtual workspace operations</h1>
          <p>
            Standalone workspace management for create, update, delete, status filtering, lifecycle
            transitions, and runtime preview.
          </p>
        </div>
        <div className="summary-grid">
          <SummaryMetric label="Total" value={workspaces.length} />
          <SummaryMetric label="Running" value={counts.running} tone="success" />
          <SummaryMetric label="Provisioning" value={counts.provisioning} tone="warning" />
          <SummaryMetric label="Failed" value={counts.failed} tone="danger" />
        </div>
      </section>

        <section
          className={errorMessage ? "workspace-status-bar workspace-status-bar--error" : "workspace-status-bar"}
          role="status"
        >
          <span>{isLoading ? "Loading..." : errorMessage || message || "Ready to manage workspaces."}</span>
        </section>

        <section className="workspace-layout">
        <section className="workspace-list-panel">
          <div className="panel-header">
            <div>
              <h2>Workspace list</h2>
              <p>Filter by lifecycle status and select a workspace to manage.</p>
            </div>
            <button className="ghost-button" type="button" onClick={() => void loadWorkspaces()}>
              Refresh
            </button>
          </div>

          <div className="filter-row">
            {statusOptions.map((status) => (
              <button
                className={statusFilter === status ? "filter-button is-active" : "filter-button"}
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
              >
                {status === "ALL" ? "All" : status}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="empty-state">Loading workspaces...</div>
          ) : filteredWorkspaces.length === 0 ? (
            <div className="empty-state">No workspace matches the current filter.</div>
          ) : (
            <div className="workspace-table">
              <div className="workspace-table-row table-head">
                <span>Name</span>
                <span>Status</span>
                <span>Profile</span>
                <span>Updated</span>
              </div>
              {filteredWorkspaces.map((workspace) => (
                <button
                  className={
                    selectedWorkspace?.id === workspace.id
                      ? "workspace-table-row is-selected"
                      : "workspace-table-row"
                  }
                  key={workspace.id}
                  type="button"
                  onClick={() => {
                    setSelectedWorkspaceId(workspace.id);
                    setIsEditMode(false);
                  }}
                >
                  <span>
                    <strong>{workspace.name}</strong>
                    <small>{workspace.ownerName}</small>
                  </span>
                  <StatusBadge status={workspace.status} />
                  <span>{workspace.config.resourceProfile}</span>
                  <span>{formatDate(workspace.updatedAt)}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="workspace-detail-panel">
          <div className="detail-panel-heading">
            <h2>Workspace detail</h2>
            {selectedWorkspace ? (
              <button className="ghost-button" type="button" onClick={() => startEditing(selectedWorkspace)}>
                Edit
              </button>
            ) : null}
          </div>

          {selectedWorkspace ? (
            isEditMode ? (
              <WorkspaceForm
                errors={formErrors}
                formState={editForm}
                submitLabel="Save changes"
                onCancel={() => setIsEditMode(false)}
                onChange={setEditForm}
                onSubmit={(event) => void updateWorkspace(event)}
              />
            ) : (
              <WorkspaceDetail
                workspace={selectedWorkspace}
                onAction={(action) => void runAction(action)}
                onDelete={() => void deleteWorkspace()}
                onOpen={() => setOpenedWorkspace(selectedWorkspace)}
              />
            )
          ) : (
            <div className="empty-state">Select a workspace to see details.</div>
          )}
        </aside>
        </section>

        <section className="create-section">
        <div>
          <h2>Create workspace</h2>
          <p>Create a mock workspace without waiting for auth, database, or container integrations.</p>
        </div>
        <WorkspaceForm
          errors={formErrors}
          formState={createForm}
          submitLabel="Create workspace"
          onChange={setCreateForm}
          onSubmit={(event) => void createWorkspace(event)}
        />
        </section>

        {openedWorkspace ? <RuntimePreview workspace={openedWorkspace} onClose={() => setOpenedWorkspace(null)} /> : null}
    </div>
  );
}

function WorkspaceForm({
  errors,
  formState,
  submitLabel,
  onCancel,
  onChange,
  onSubmit
}: {
  errors: Record<string, string>;
  formState: WorkspaceFormState;
  submitLabel: string;
  onCancel?: () => void;
  onChange: (state: WorkspaceFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="create-form" onSubmit={onSubmit}>
      <label>
        Workspace name
        <input
          value={formState.name}
          onChange={(event) => onChange({ ...formState, name: event.target.value })}
        />
        {errors.name ? <span className="field-error">{errors.name}</span> : null}
      </label>
      <label>
        Description
        <textarea
          value={formState.description}
          onChange={(event) => onChange({ ...formState, description: event.target.value })}
        />
      </label>
      <label>
        Template
        <select
          value={formState.templateId}
          onChange={(event) => onChange({ ...formState, templateId: event.target.value })}
        >
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.label}
            </option>
          ))}
        </select>
        {errors.templateId ? <span className="field-error">{errors.templateId}</span> : null}
      </label>
      <label>
        Resource profile
        <select
          value={formState.resourceProfile}
          onChange={(event) =>
            onChange({ ...formState, resourceProfile: event.target.value as WorkspaceResourceProfile })
          }
        >
          {resourceProfiles.map((profile) => (
            <option key={profile} value={profile}>
              {profile}
            </option>
          ))}
        </select>
        {errors.resourceProfile ? <span className="field-error">{errors.resourceProfile}</span> : null}
      </label>
      <label>
        Region
        <input
          value={formState.region}
          onChange={(event) => onChange({ ...formState, region: event.target.value })}
        />
      </label>
      <div className="form-actions">
        {onCancel ? (
          <button className="ghost-button" type="button" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
        <button className="primary-button" type="submit">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function WorkspaceDetail({
  workspace,
  onAction,
  onDelete,
  onOpen
}: {
  workspace: Workspace;
  onAction: (action: WorkspaceAction) => void;
  onDelete: () => void;
  onOpen: () => void;
}) {
  return (
    <>
      <div className="detail-title">
        <div>
          <h3>{workspace.name}</h3>
          <p>{workspace.description || "No description."}</p>
        </div>
        <StatusBadge status={workspace.status} />
      </div>
      <dl className="detail-list">
        <DetailItem label="Template" value={workspace.config.templateId} />
        <DetailItem label="Profile" value={workspace.config.resourceProfile} />
        <DetailItem label="Region" value={workspace.config.region} />
        <DetailItem label="Container" value={workspace.containerId ?? "Not allocated"} />
        <DetailItem label="OpenClaw" value={workspace.openClawInstanceId ?? "Not started"} />
      </dl>
      {workspace.status === "FAILED" ? (
        <div className="failure-box">
          <strong>Failure reason</strong>
          <p>{workspace.failureReason ?? "Unknown failure."}</p>
        </div>
      ) : null}
      <div className="action-bar">
        {workspace.status === "PROVISIONING" ? (
          <>
            <button className="primary-button compact" type="button" onClick={() => onAction("complete")}>
              Complete
            </button>
            <button className="danger-button compact" type="button" onClick={() => onAction("fail")}>
              Simulate fail
            </button>
          </>
        ) : null}
        {workspace.status === "RUNNING" ? (
          <>
            <button className="primary-button compact" type="button" onClick={onOpen}>
              Open workspace
            </button>
            <button className="ghost-button" type="button" onClick={() => onAction("stop")}>
              Stop
            </button>
            <button className="ghost-button" type="button" onClick={() => onAction("restart")}>
              Restart
            </button>
          </>
        ) : null}
        {workspace.status === "STOPPED" ? (
          <button className="primary-button compact" type="button" onClick={() => onAction("start")}>
            Start
          </button>
        ) : null}
        {workspace.status === "FAILED" ? (
          <button className="primary-button compact" type="button" onClick={() => onAction("retry")}>
            Retry
          </button>
        ) : null}
        <button className="danger-button compact" type="button" onClick={onDelete}>
          Delete
        </button>
      </div>
    </>
  );
}

function RuntimePreview({ workspace, onClose }: { workspace: Workspace; onClose: () => void }) {
  return (
    <section className="runtime-preview">
      <div className="runtime-toolbar">
        <div>
          <p className="eyebrow">Runtime preview</p>
          <h2>{workspace.name}</h2>
        </div>
        <button className="ghost-button" type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="runtime-grid">
        <div className="runtime-console">
          <span>$ workspace status</span>
          <strong>{workspace.status}</strong>
          <span>$ container</span>
          <strong>{workspace.containerId ?? "not allocated"}</strong>
          <span>$ openclaw instance</span>
          <strong>{workspace.openClawInstanceId ?? "not started"}</strong>
        </div>
        <div className="runtime-card">
          <h3>Workspace is ready</h3>
          <p>
            This is a local runtime preview. It will be replaced by the real OpenClaw runtime URL
            when the integration is available.
          </p>
        </div>
      </div>
    </section>
  );
}

function SummaryMetric({
  label,
  value,
  tone = "neutral"
}: {
  label: string;
  value: number;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  return (
    <div className={`summary-metric tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: WorkspaceStatus }) {
  return <span className={`status-badge status-${status.toLowerCase()}`}>{status}</span>;
}

function toFormState(workspace: Workspace): WorkspaceFormState {
  return {
    name: workspace.name,
    description: workspace.description,
    templateId: workspace.config.templateId,
    resourceProfile: workspace.config.resourceProfile,
    region: workspace.config.region
  };
}

function toCreateInput(formState: WorkspaceFormState): CreateWorkspaceInput {
  return {
    name: formState.name,
    description: formState.description,
    templateId: formState.templateId,
    resourceProfile: formState.resourceProfile,
    region: formState.region
  };
}

function toUpdateInput(formState: WorkspaceFormState): UpdateWorkspaceInput {
  return toCreateInput(formState);
}

function toFieldErrors(details: WorkspaceValidationIssue[]) {
  return details.reduce<Record<string, string>>((errors, item) => {
    errors[item.field] = item.message;
    return errors;
  }, {});
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Request failed.";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

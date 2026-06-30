import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

type WorkspaceStatus = "PENDING" | "PROVISIONING" | "RUNNING" | "FAILED" | "STOPPED";
type WorkspaceResourceProfile = "Starter" | "Standard" | "Performance";
type StatusFilter = "ALL" | WorkspaceStatus;

interface Workspace {
  id: string;
  name: string;
  description: string;
  ownerName: string;
  status: WorkspaceStatus;
  config: {
    templateId: string;
    resourceProfile: WorkspaceResourceProfile;
    region: string;
  };
  accessUrl?: string;
  containerId?: string;
  openClawInstanceId?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

interface WorkspaceListResponse {
  data: Workspace[];
}

interface WorkspaceResponse {
  data: Workspace;
}

interface ValidationErrorResponse {
  error: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}

interface WorkspaceFormState {
  name: string;
  description: string;
  templateId: string;
  resourceProfile: WorkspaceResourceProfile;
  region: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

const statusOptions: StatusFilter[] = ["ALL", "PENDING", "PROVISIONING", "RUNNING", "FAILED", "STOPPED"];
const resourceProfiles: WorkspaceResourceProfile[] = ["Starter", "Standard", "Performance"];
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function getStatusLabel(status: WorkspaceStatus) {
  const labels: Record<WorkspaceStatus, string> = {
    PENDING: "Pending",
    PROVISIONING: "Provisioning",
    RUNNING: "Running",
    FAILED: "Failed",
    STOPPED: "Stopped"
  };

  return labels[status];
}

export function App() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [openedWorkspace, setOpenedWorkspace] = useState<Workspace | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [createForm, setCreateForm] = useState<WorkspaceFormState>(emptyFormState);
  const [editForm, setEditForm] = useState<WorkspaceFormState>(emptyFormState);

  async function loadWorkspaces() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const body = await request<WorkspaceListResponse>("/api/workspaces");
      setWorkspaces(body.data);
      setSelectedWorkspaceId((currentId) => currentId || body.data[0]?.id || "");
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
    if (statusFilter === "ALL") {
      return workspaces;
    }

    return workspaces.filter((workspace) => workspace.status === statusFilter);
  }, [statusFilter, workspaces]);

  const selectedWorkspace = useMemo(() => {
    return workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? filteredWorkspaces[0];
  }, [filteredWorkspaces, selectedWorkspaceId, workspaces]);

  const runningCount = workspaces.filter((workspace) => workspace.status === "RUNNING").length;
  const provisioningCount = workspaces.filter((workspace) => workspace.status === "PROVISIONING").length;
  const failedCount = workspaces.filter((workspace) => workspace.status === "FAILED").length;
  const stoppedCount = workspaces.filter((workspace) => workspace.status === "STOPPED").length;

  function selectWorkspace(workspace: Workspace) {
    setSelectedWorkspaceId(workspace.id);
    setIsEditMode(false);
    setEditErrors({});
  }

  function startEdit(workspace: Workspace) {
    setEditForm(toFormState(workspace));
    setEditErrors({});
    setIsEditMode(true);
  }

  async function handleCreateWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    setErrorMessage("");
    setSuccessMessage("");
    setFormErrors({});

    try {
      const body = await request<WorkspaceResponse>("/api/workspaces", {
        method: "POST",
        body: createForm
      });
      upsertWorkspace(body.data);
      setSelectedWorkspaceId(body.data.id);
      setStatusFilter("ALL");
      setCreateForm(emptyFormState);
      setSuccessMessage("Workspace da duoc tao va dang provisioning.");
    } catch (error) {
      handleFormError(error, setFormErrors);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdateWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedWorkspace) {
      return;
    }

    setIsUpdating(true);
    setErrorMessage("");
    setSuccessMessage("");
    setEditErrors({});

    try {
      const body = await request<WorkspaceResponse>(`/api/workspaces/${selectedWorkspace.id}`, {
        method: "PATCH",
        body: editForm
      });
      upsertWorkspace(body.data);
      setIsEditMode(false);
      setSuccessMessage("Workspace da duoc cap nhat.");
    } catch (error) {
      handleFormError(error, setEditErrors);
    } finally {
      setIsUpdating(false);
    }
  }

  async function runWorkspaceAction(
    workspace: Workspace,
    action: "start" | "stop" | "restart" | "retry" | "complete" | "fail"
  ) {
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const body = await request<WorkspaceResponse>(`/api/workspaces/${workspace.id}/${action}`, {
        method: "POST",
        body:
          action === "fail"
            ? {
                reason:
                  window.prompt("Nhap ly do fail", "Container runtime khong san sang.") ??
                  "Container runtime khong san sang."
              }
            : undefined
      });
      upsertWorkspace(body.data);
      setSelectedWorkspaceId(body.data.id);
      setSuccessMessage(`Workspace da chuyen sang ${getStatusLabel(body.data.status)}.`);
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    }
  }

  async function handleDeleteWorkspace(workspace: Workspace) {
    if (!window.confirm(`Xoa workspace "${workspace.name}"?`)) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    try {
      await request(`/api/workspaces/${workspace.id}`, {
        method: "DELETE"
      });
      setWorkspaces((current) => {
        const next = current.filter((item) => item.id !== workspace.id);
        setSelectedWorkspaceId(next[0]?.id ?? "");
        return next;
      });
      setOpenedWorkspace((current) => (current?.id === workspace.id ? null : current));
      setIsEditMode(false);
      setSuccessMessage("Workspace da duoc xoa.");
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    }
  }

  function upsertWorkspace(workspace: Workspace) {
    setWorkspaces((current) => {
      const exists = current.some((item) => item.id === workspace.id);

      if (!exists) {
        return [workspace, ...current];
      }

      return current.map((item) => (item.id === workspace.id ? workspace : item));
    });
    setOpenedWorkspace((current) => (current?.id === workspace.id ? workspace : current));
  }

  function handleFormError(error: unknown, setErrors: (errors: Record<string, string>) => void) {
    if (error instanceof ApiValidationError) {
      setErrors(
        error.details.reduce<Record<string, string>>((errors, item) => {
          errors[item.field] = item.message;
          return errors;
        }, {})
      );
      return;
    }

    setErrorMessage(toErrorMessage(error));
  }

  return (
    <main className="workspace-page">
      <section className="workspace-hero">
        <div>
          <p className="eyebrow">AI-Agent Enterprise Platform</p>
          <h1>Workspace Management</h1>
          <p>
            Quan ly workspace, test CRUD va lifecycle actions doc lap truoc khi tich hop
            database, auth va container runtime that.
          </p>
        </div>
        <div className="summary-grid" aria-label="Workspace summary">
          <SummaryMetric label="Total" value={workspaces.length} />
          <SummaryMetric label="Running" value={runningCount} tone="success" />
          <SummaryMetric label="Provisioning" value={provisioningCount} tone="warning" />
          <SummaryMetric label="Failed" value={failedCount} tone="danger" />
          <SummaryMetric label="Stopped" value={stoppedCount} />
        </div>
      </section>

      {errorMessage ? <div className="alert alert-error">{errorMessage}</div> : null}
      {successMessage ? <div className="alert alert-success">{successMessage}</div> : null}

      <section className="workspace-layout">
        <div className="workspace-list-panel">
          <div className="panel-header">
            <div>
              <h2>Danh sach workspace</h2>
              <p>Test list, filter, detail va lifecycle status.</p>
            </div>
            <button className="ghost-button" type="button" onClick={() => void loadWorkspaces()}>
              Refresh
            </button>
          </div>

          <div className="filter-row" aria-label="Loc workspace theo trang thai">
            {statusOptions.map((status) => (
              <button
                className={statusFilter === status ? "filter-button is-active" : "filter-button"}
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
              >
                {status === "ALL" ? "All" : getStatusLabel(status)}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="empty-state">Dang tai workspace...</div>
          ) : filteredWorkspaces.length === 0 ? (
            <div className="empty-state">Khong co workspace phu hop voi bo loc.</div>
          ) : (
            <div className="workspace-table" role="table" aria-label="Workspace list">
              <div className="workspace-table-row table-head" role="row">
                <span>Ten workspace</span>
                <span>Trang thai</span>
                <span>Profile</span>
                <span>Cap nhat</span>
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
                  onClick={() => selectWorkspace(workspace)}
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
        </div>

        <aside className="workspace-detail-panel">
          <div className="detail-panel-heading">
            <h2>Chi tiet workspace</h2>
            {selectedWorkspace ? (
              <button className="ghost-button" type="button" onClick={() => startEdit(selectedWorkspace)}>
                Edit
              </button>
            ) : null}
          </div>

          {selectedWorkspace ? (
            isEditMode ? (
              <WorkspaceForm
                errors={editErrors}
                formState={editForm}
                isSubmitting={isUpdating}
                submitLabel="Luu thay doi"
                onCancel={() => setIsEditMode(false)}
                onChange={setEditForm}
                onSubmit={(event) => void handleUpdateWorkspace(event)}
              />
            ) : (
              <>
                <div className="detail-title">
                  <div>
                    <h3>{selectedWorkspace.name}</h3>
                    <p>{selectedWorkspace.description || "Chua co mo ta."}</p>
                  </div>
                  <StatusBadge status={selectedWorkspace.status} />
                </div>
                <dl className="detail-list">
                  <DetailItem label="Template" value={selectedWorkspace.config.templateId} />
                  <DetailItem label="Resource profile" value={selectedWorkspace.config.resourceProfile} />
                  <DetailItem label="Region" value={selectedWorkspace.config.region} />
                  <DetailItem label="Container" value={selectedWorkspace.containerId ?? "Chua cap phat"} />
                  <DetailItem
                    label="OpenClaw instance"
                    value={selectedWorkspace.openClawInstanceId ?? "Dang cho khoi tao"}
                  />
                  <DetailItem label="Created" value={formatDate(selectedWorkspace.createdAt)} />
                </dl>
                {selectedWorkspace.status === "FAILED" ? (
                  <div className="failure-box">
                    <strong>Failure reason</strong>
                    <p>{selectedWorkspace.failureReason ?? "Khong xac dinh."}</p>
                  </div>
                ) : null}
                <WorkspaceActions
                  workspace={selectedWorkspace}
                  onAction={(action) => void runWorkspaceAction(selectedWorkspace, action)}
                  onDelete={() => void handleDeleteWorkspace(selectedWorkspace)}
                  onOpen={() => setOpenedWorkspace(selectedWorkspace)}
                />
              </>
            )
          ) : (
            <div className="empty-state">Chon mot workspace de xem chi tiet.</div>
          )}
        </aside>
      </section>

      <section className="create-section">
        <div>
          <h2>Tao workspace moi</h2>
          <p>Test create va validation ma khong can feature khac.</p>
        </div>
        <WorkspaceForm
          errors={formErrors}
          formState={createForm}
          isSubmitting={isCreating}
          submitLabel="Tao workspace"
          onChange={setCreateForm}
          onSubmit={(event) => void handleCreateWorkspace(event)}
        />
      </section>

      {openedWorkspace ? (
        <section className="runtime-preview" aria-label="Workspace runtime preview">
          <div className="runtime-toolbar">
            <div>
              <p className="eyebrow">Runtime Preview</p>
              <h2>{openedWorkspace.name}</h2>
            </div>
            <button className="ghost-button" type="button" onClick={() => setOpenedWorkspace(null)}>
              Close
            </button>
          </div>
          <div className="runtime-grid">
            <div className="runtime-console">
              <span>$ openclaw workspace status</span>
              <strong>{getStatusLabel(openedWorkspace.status)}</strong>
              <span>$ container</span>
              <strong>{openedWorkspace.containerId ?? "not allocated"}</strong>
              <span>$ openclaw-instance</span>
              <strong>{openedWorkspace.openClawInstanceId ?? "not started"}</strong>
            </div>
            <div className="runtime-card">
              <h3>Workspace ready</h3>
              <p>
                Day la man hinh gia lap moi truong workspace dang chay. Khi nhom co OpenClaw
                va container runtime that, phan nay se duoc thay bang URL/runtime that.
              </p>
              <dl className="detail-list">
                <DetailItem label="Template" value={openedWorkspace.config.templateId} />
                <DetailItem label="Resource profile" value={openedWorkspace.config.resourceProfile} />
                <DetailItem label="Region" value={openedWorkspace.config.region} />
              </dl>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}

function WorkspaceForm({
  errors,
  formState,
  isSubmitting,
  submitLabel,
  onCancel,
  onChange,
  onSubmit
}: {
  errors: Record<string, string>;
  formState: WorkspaceFormState;
  isSubmitting: boolean;
  submitLabel: string;
  onCancel?: () => void;
  onChange: (state: WorkspaceFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="create-form" onSubmit={onSubmit}>
      <label>
        Ten workspace
        <input
          name="name"
          placeholder="Vi du: Marketing Operation Workspace"
          value={formState.name}
          onChange={(event) => onChange({ ...formState, name: event.target.value })}
        />
        {errors.name ? <span className="field-error">{errors.name}</span> : null}
      </label>
      <label>
        Mo ta
        <textarea
          name="description"
          placeholder="Mo ta muc dich su dung workspace"
          value={formState.description}
          onChange={(event) => onChange({ ...formState, description: event.target.value })}
        />
      </label>
      <label>
        Template
        <select
          name="templateId"
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
          name="resourceProfile"
          value={formState.resourceProfile}
          onChange={(event) =>
            onChange({
              ...formState,
              resourceProfile: event.target.value as WorkspaceResourceProfile
            })
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
          name="region"
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
        <button className="primary-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Dang xu ly..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

function WorkspaceActions({
  workspace,
  onAction,
  onDelete,
  onOpen
}: {
  workspace: Workspace;
  onAction: (action: "start" | "stop" | "restart" | "retry" | "complete" | "fail") => void;
  onDelete: () => void;
  onOpen: () => void;
}) {
  return (
    <div className="action-bar">
      {workspace.status === "PROVISIONING" ? (
        <>
          <button className="primary-button compact" type="button" onClick={() => onAction("complete")}>
            Complete provisioning
          </button>
          <button className="danger-button compact" type="button" onClick={() => onAction("fail")}>
            Simulate fail
          </button>
        </>
      ) : null}
      {workspace.status === "RUNNING" ? (
        <>
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
          Retry provisioning
        </button>
      ) : null}
      <button className="danger-button compact" type="button" onClick={onDelete}>
        Delete
      </button>
      {workspace.status === "RUNNING" ? (
        <button className="primary-link compact" type="button" onClick={onOpen}>
          Open workspace
        </button>
      ) : null}
    </div>
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
  return <span className={`status-badge status-${status.toLowerCase()}`}>{getStatusLabel(status)}</span>;
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

async function request<T = unknown>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
  } = {}
) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const body = (await response.json()) as ValidationErrorResponse;

  if (!response.ok) {
    if (body.details?.length) {
      throw new ApiValidationError(body.details);
    }

    throw new Error(body.error || "Request failed.");
  }

  return body as T;
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Da co loi xay ra.";
}

class ApiValidationError extends Error {
  details: NonNullable<ValidationErrorResponse["details"]>;

  constructor(details: NonNullable<ValidationErrorResponse["details"]>) {
    super("Validation failed");
    this.details = details;
  }
}

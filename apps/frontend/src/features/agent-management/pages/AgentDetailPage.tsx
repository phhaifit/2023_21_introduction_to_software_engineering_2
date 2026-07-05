import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Agent, UpdateAgentInput } from "@ai-agent-platform/shared";
import { deleteAgent, getAgent, updateAgent } from "../api/agentApi";

import "../styles/agents.css";

interface AgentEditForm {
  name: string;
  role: string;
  model: string;
  instructionContent: string;
  skillFileContent: string;
  status: Agent["status"];
}

type SkillEditMode = "direct" | "upload";

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Request failed.";
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function toStatusLabel(status: Agent["status"]): string {
  return status[0].toUpperCase() + status.slice(1);
}

function toEditForm(agent: Agent): AgentEditForm {
  return {
    name: agent.name,
    role: agent.role,
    model: agent.model,
    instructionContent: agent.instructionContent,
    skillFileContent: agent.skillFileContent ?? "",
    status: agent.status
  };
}

export function AgentDetailPage() {
  const navigate = useNavigate();
  const { agentId = "" } = useParams();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [editForm, setEditForm] = useState<AgentEditForm | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleteConfirmClosing, setIsDeleteConfirmClosing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [uploadedSkillFileName, setUploadedSkillFileName] = useState("");
  const [uploadedSkillFileContent, setUploadedSkillFileContent] = useState("");
  const [skillFileInputKey, setSkillFileInputKey] = useState(0);
  const [skillEditMode, setSkillEditMode] = useState<SkillEditMode>("direct");

  useEffect(() => {
    async function loadAgent() {
      setIsLoading(true);
      setLoadError("");

      try {
        const loadedAgent = await getAgent(agentId);
        setAgent(loadedAgent);
        setEditForm(toEditForm(loadedAgent));
      } catch (error) {
        setLoadError(toErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    }

    if (!agentId) {
      setLoadError("Agent id is missing.");
      setIsLoading(false);
      return;
    }

    void loadAgent();
  }, [agentId]);

  useEffect(() => {
    if (!isDeleteConfirmOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsDeleteConfirmOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isDeleteConfirmOpen]);

  useEffect(() => {
    if (!isDeleteConfirmClosing) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsDeleteConfirmClosing(false);
    }, 180);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isDeleteConfirmClosing]);

  const isDeleteConfirmRendered = isDeleteConfirmOpen || isDeleteConfirmClosing;

  function handleFieldChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    if (!editForm) {
      return;
    }

    const { name, value } = event.target;

    if (name === "name" || name === "role" || name === "model") {
      setEditForm({ ...editForm, [name]: value });
      return;
    }

    if (name === "instruction") {
      setEditForm({ ...editForm, instructionContent: value });
      return;
    }

    if (name === "skillFileContent") {
      setEditForm({ ...editForm, skillFileContent: value });
      return;
    }

    if (name === "status") {
      setEditForm({
        ...editForm,
        status: value === "inactive" ? "inactive" : "active"
      });
    }
  }

  function handleEnterEditMode() {
    if (!agent) {
      return;
    }

    setSaveError("");
    setEditForm(toEditForm(agent));
    setUploadedSkillFileName("");
    setUploadedSkillFileContent("");
    setSkillEditMode("direct");
    setIsEditMode(true);
  }

  function handleOpenDeleteConfirm() {
    if (!agent || isSaving) {
      return;
    }

    setDeleteError("");
    setIsDeleteConfirmClosing(false);
    setIsDeleteConfirmOpen(true);
  }

  function handleCancelDelete() {
    setDeleteError("");
    setIsDeleteConfirmOpen(false);
    setIsDeleteConfirmClosing(true);
  }

  async function handleConfirmDelete() {
    if (!agent || isDeleting) {
      return;
    }

    setIsDeleting(true);
    setDeleteError("");

    try {
      await deleteAgent(agent.id);
      navigate("/app/agents", { replace: true });
    } catch (error) {
      setDeleteError(toErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  }

  function handleCancelEdit() {
    if (!agent) {
      return;
    }

    setSaveError("");
    setEditForm(toEditForm(agent));
    setUploadedSkillFileName("");
    setUploadedSkillFileContent("");
    setSkillEditMode("direct");
    setSkillFileInputKey((current) => current + 1);
    setIsEditMode(false);
  }

  async function handleSkillFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (!editForm) {
      return;
    }

    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      setUploadedSkillFileName("");
      return;
    }

    const normalizedFileName = selectedFile.name.trim().toLowerCase();

    if (normalizedFileName !== "skill.md") {
      setSaveError("Please upload a file named skill.md.");
      setUploadedSkillFileName("");
      setSkillFileInputKey((current) => current + 1);
      return;
    }

    try {
      const content = await selectedFile.text();

      if (!content.trim()) {
        setSaveError("Uploaded skill.md cannot be empty.");
        setUploadedSkillFileName("");
        setSkillFileInputKey((current) => current + 1);
        return;
      }

      setSaveError("");
      setUploadedSkillFileName(selectedFile.name);
      setUploadedSkillFileContent(content);
      setEditForm({
        ...editForm,
        skillFileContent: content
      });
    } catch {
      setSaveError("Unable to read the uploaded skill.md file.");
      setUploadedSkillFileName("");
      setSkillFileInputKey((current) => current + 1);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!agent || !editForm) {
      return;
    }

    const payload: UpdateAgentInput = {
      name: editForm.name.trim(),
      role: editForm.role.trim(),
      model: editForm.model.trim(),
      instructionContent: editForm.instructionContent.trim(),
      skillFileContent: skillEditMode === "upload" ? uploadedSkillFileContent.trim() : editForm.skillFileContent.trim(),
      status: editForm.status
    };

    if (!payload.name || !payload.role || !payload.model || !payload.instructionContent || !payload.skillFileContent) {
      setSaveError("Please fill in all editable fields before confirming changes.");
      return;
    }

    if (skillEditMode === "upload" && !uploadedSkillFileContent.trim()) {
      setSaveError("Please upload a new skill.md file before confirming changes.");
      return;
    }

    setIsSaving(true);
    setSaveError("");

    try {
      const updatedAgent = await updateAgent(agent.id, payload);
      setAgent(updatedAgent);
      setEditForm(toEditForm(updatedAgent));
      setUploadedSkillFileName("");
      setUploadedSkillFileContent("");
      setSkillEditMode("direct");
      setSkillFileInputKey((current) => current + 1);
      setIsEditMode(false);
    } catch (error) {
      setSaveError(toErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="agents-main agent-page-enter">
        <div className={isEditMode ? "agent-detail-toolbar agent-detail-toolbar--editing agent-animate-in" : "agent-detail-toolbar agent-animate-in"}>
          <Link className="btn-secondary agent-inline-link" to="/app/agents">
            Back to agents
          </Link>
          {!isLoading && agent ? (
            <div className="agent-detail-top-actions">
              <button type="button" className="btn-primary" onClick={handleEnterEditMode} disabled={isEditMode || isSaving || isDeleting}>
                Edit agent
              </button>
            </div>
          ) : null}
        </div>

        {isLoading ? <p className="agents-list-state">Loading agent...</p> : null}
        {!isLoading && loadError ? <p className="agents-list-state agents-list-state--error">{loadError}</p> : null}

        {!isLoading && !loadError && agent && editForm ? (
          <form className={isEditMode ? "agent-detail-layout agent-detail-layout--editing" : "agent-detail-layout"} onSubmit={handleSubmit}>
            <section className="agents-panel agent-detail-section agent-detail-unified-box">
              <div className="agent-detail-box-header">
                <div>
                  <p className="agents-eyebrow">Agent Detail</p>
                  <h1 className="agent-detail-title">{agent.name}</h1>
                </div>
              </div>

              <div className="agent-detail-info-list">
                <label className={isEditMode ? "agent-detail-info-item agent-detail-info-item--editable" : "agent-detail-info-item"}>
                  <span className="agent-detail-info-label-row"><span className="agent-detail-info-label">Agent name</span></span>
                  {isEditMode ? <input name="name" value={editForm.name} onChange={handleFieldChange} disabled={isSaving} /> : <span className="agent-detail-info-value">{agent.name}</span>}
                </label>

                <label className={isEditMode ? "agent-detail-info-item agent-detail-info-item--editable" : "agent-detail-info-item"}>
                  <span className="agent-detail-info-label-row"><span className="agent-detail-info-label">Role</span></span>
                  {isEditMode ? <input name="role" value={editForm.role} onChange={handleFieldChange} disabled={isSaving} /> : <span className="agent-detail-info-value">{agent.role}</span>}
                </label>

                <label className={isEditMode ? "agent-detail-info-item agent-detail-info-item--editable" : "agent-detail-info-item"}>
                  <span className="agent-detail-info-label-row"><span className="agent-detail-info-label">Model</span></span>
                  {isEditMode ? <input name="model" value={editForm.model} onChange={handleFieldChange} disabled={isSaving} /> : <span className="agent-detail-info-value">{agent.model}</span>}
                </label>

                <label className={isEditMode ? "agent-detail-info-item agent-detail-info-item--editable" : "agent-detail-info-item"}>
                  <span className="agent-detail-info-label-row"><span className="agent-detail-info-label">Status</span></span>
                  {isEditMode ? <select name="status" value={editForm.status} onChange={handleFieldChange} disabled={isSaving}><option value="active">Active</option><option value="inactive">Inactive</option></select> : <span className="agent-detail-info-value">{toStatusLabel(agent.status)}</span>}
                </label>

                <div className={isEditMode ? "agent-detail-info-item agent-detail-info-item--readonly agent-detail-info-item--muted" : "agent-detail-info-item agent-detail-info-item--readonly"}>
                  <span className="agent-detail-info-label">Agent ID</span>
                  <span className="agent-detail-info-value">{agent.id}</span>
                </div>

                <div className={isEditMode ? "agent-detail-info-item agent-detail-info-item--readonly agent-detail-info-item--muted" : "agent-detail-info-item agent-detail-info-item--readonly"}>
                  <span className="agent-detail-info-label">Created at</span>
                  <span className="agent-detail-info-value">{formatDateTime(agent.createdAt)}</span>
                </div>

                <div className={isEditMode ? "agent-detail-info-item agent-detail-info-item--readonly agent-detail-info-item--muted" : "agent-detail-info-item agent-detail-info-item--readonly"}>
                  <span className="agent-detail-info-label">Updated at</span>
                  <span className="agent-detail-info-value">{formatDateTime(agent.updatedAt)}</span>
                </div>

                <label className={isEditMode ? "agent-detail-info-item agent-detail-info-item--full agent-detail-info-item--editable" : "agent-detail-info-item agent-detail-info-item--full"}>
                  <span className="agent-detail-info-label-row"><span className="agent-detail-info-label">Instruction</span></span>
                  {isEditMode ? <textarea name="instruction" rows={10} value={editForm.instructionContent} onChange={handleFieldChange} disabled={isSaving} /> : <span className="agent-detail-info-value agent-detail-info-value--multiline">{agent.instructionContent}</span>}
                </label>

                <div className={isEditMode ? "agent-detail-info-item agent-detail-info-item--full agent-detail-info-item--editable" : "agent-detail-info-item agent-detail-info-item--full"}>
                  <span className="agent-detail-info-label-row"><span className="agent-detail-info-label">skill.md content</span></span>
                  {isEditMode ? (
                    <>
                      <div className="agent-detail-skill-methods agent-animate-in" role="radiogroup" aria-label="skill.md update method">
                        <label className={skillEditMode === "direct" ? "agent-detail-method-option is-active" : "agent-detail-method-option"}>
                          <input
                            type="radio"
                            name="skillEditMode"
                            value="direct"
                            checked={skillEditMode === "direct"}
                            onChange={() => setSkillEditMode("direct")}
                            disabled={isSaving}
                          />
                          <span>Edit current content</span>
                        </label>

                        <label className={skillEditMode === "upload" ? "agent-detail-method-option is-active" : "agent-detail-method-option"}>
                          <input
                            type="radio"
                            name="skillEditMode"
                            value="upload"
                            checked={skillEditMode === "upload"}
                            onChange={() => setSkillEditMode("upload")}
                            disabled={isSaving}
                          />
                          <span>Upload new skill.md</span>
                        </label>
                      </div>

                      <div className={skillEditMode === "direct" ? "agent-detail-skill-panel is-active agent-animate-in" : "agent-detail-skill-panel is-inactive"}>
                        <textarea
                          name="skillFileContent"
                          rows={14}
                          value={editForm.skillFileContent}
                          onChange={handleFieldChange}
                          disabled={isSaving || skillEditMode !== "direct"}
                        />
                      </div>

                      <div className={skillEditMode === "upload" ? "agent-detail-skill-panel is-active agent-animate-in" : "agent-detail-skill-panel is-inactive"}>
                        <label className="agent-detail-file-upload">
                          <span className="agent-detail-file-upload-label">Upload replacement skill.md</span>
                          <input
                            key={skillFileInputKey}
                            type="file"
                            accept=".md,text/markdown"
                            onChange={(event) => void handleSkillFileChange(event)}
                            disabled={isSaving || skillEditMode !== "upload"}
                          />
                        </label>

                        <p className="agents-form-hint">
                          {uploadedSkillFileName
                            ? `Loaded from file: ${uploadedSkillFileName}`
                            : "Upload mode only accepts one file named skill.md and will replace the current content on confirm."}
                        </p>
                      </div>
                    </>
                  ) : (
                    <span className="agent-detail-info-value agent-detail-info-value--multiline">{agent.skillFileContent || "No skill.md content stored."}</span>
                  )}
                </div>
              </div>
            </section>

            {!isEditMode ? (
              <div className="agent-detail-confirm-bar agent-animate-in">
                <button type="button" className="btn-danger" onClick={handleOpenDeleteConfirm} disabled={isSaving || isDeleting}>
                  Delete agent
                </button>
              </div>
            ) : null}

            {saveError ? <p className="agents-list-state agents-list-state--error">{saveError}</p> : null}

            {isEditMode ? (
              <div className="agent-detail-confirm-bar agent-animate-in">
                <button type="button" className="btn-secondary" onClick={handleCancelEdit} disabled={isSaving}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSaving}>
                  {isSaving ? "Saving changes..." : "Confirm changes"}
                </button>
              </div>
            ) : null}
          </form>
        ) : null}

        {isDeleteConfirmRendered ? (
          <>
            <button
              type="button"
              className={isDeleteConfirmClosing ? "agents-modal-backdrop agents-modal-backdrop--closing" : "agents-modal-backdrop"}
              aria-label="Close delete confirmation dialog"
              onClick={handleCancelDelete}
            />

            <section
              className={
                isDeleteConfirmClosing
                  ? "agent-delete-confirm-panel agent-delete-confirm-panel--closing"
                  : "agent-delete-confirm-panel"
              }
              aria-labelledby="delete-agent-title"
              aria-modal="true"
              role="dialog"
            >
              <div className="agents-panel-header">
                <h2 id="delete-agent-title">Delete this agent?</h2>
                <p>
                  This will permanently remove {agent?.name ?? "the selected agent"} from the workspace.
                </p>
              </div>

              {deleteError ? <p className="agents-list-state agents-list-state--error">{deleteError}</p> : null}

              <div className="agent-delete-confirm-actions">
                <button type="button" className="btn-secondary" onClick={handleCancelDelete} disabled={isDeleting}>
                  Cancel
                </button>
                <button type="button" className="btn-danger" onClick={() => void handleConfirmDelete()} disabled={isDeleting}>
                  {isDeleting ? "Deleting..." : "Confirm"}
                </button>
              </div>
            </section>
          </>
        ) : null}
    </div>
  );
}

import { useEffect, useState, type ChangeEvent, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { Agent } from "@ai-agent-platform/shared";
import { AppSidebar } from "../../../app/components/AppSidebar";
import { AppTopBar } from "../../../app/components/AppTopBar";
import { createAgent, listAgents } from "../api/agentApi";

import "../styles/agents.css";

interface AgentFormValues {
  name: string;
  role: string;
  model: string;
  instructionContent: string;
  status: Agent["status"];
}

interface CreateAgentPayload extends AgentFormValues {
  skillFileContent?: string;
}

const DEFAULT_AGENT_FORM: AgentFormValues = {
  name: "",
  role: "",
  model: "gpt-4o-mini",
  instructionContent: "",
  status: "active"
};

function toStatusLabel(status: Agent["status"]): string {
  return status[0].toUpperCase() + status.slice(1);
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Request failed.";
}

export function AgentManagementPage() {
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [agentsError, setAgentsError] = useState("");

  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [createForm, setCreateForm] = useState<AgentFormValues>(DEFAULT_AGENT_FORM);
  const [uploadedSkillFileName, setUploadedSkillFileName] = useState("");
  const [uploadedSkillFileContent, setUploadedSkillFileContent] = useState("");
  const [createFileInputKey, setCreateFileInputKey] = useState(0);
  const [createFormError, setCreateFormError] = useState("");
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);

  useEffect(() => {
    async function bootstrapAgents() {
      setIsLoadingAgents(true);
      setAgentsError("");

      try {
        setAgents(await listAgents());
      } catch (error) {
        setAgentsError(toErrorMessage(error));
      } finally {
        setIsLoadingAgents(false);
      }
    }

    void bootstrapAgents();
  }, []);

  useEffect(() => {
    if (!isCreatePanelOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsCreatePanelOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isCreatePanelOpen]);

  function handleCreateFieldChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = event.target;

    if (name === "name" || name === "role" || name === "model") {
      setCreateForm((current) => ({ ...current, [name]: value }));
      return;
    }

    if (name === "instruction") {
      setCreateForm((current) => ({ ...current, instructionContent: value }));
      return;
    }

    if (name === "status") {
      setCreateForm((current) => ({
        ...current,
        status: value === "inactive" ? "inactive" : "active"
      }));
    }
  }

  async function handleCreateSkillFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      setUploadedSkillFileName("");
      setUploadedSkillFileContent("");
      return;
    }

    const normalizedFileName = selectedFile.name.trim().toLowerCase();

    if (normalizedFileName !== "skill.md") {
      setCreateFormError("Please upload a file named skill.md.");
      setUploadedSkillFileName("");
      setUploadedSkillFileContent("");
      setCreateFileInputKey((current) => current + 1);
      return;
    }

    try {
      const content = await selectedFile.text();

      if (!content.trim()) {
        setCreateFormError("Uploaded skill.md cannot be empty.");
        setUploadedSkillFileName("");
        setUploadedSkillFileContent("");
        setCreateFileInputKey((current) => current + 1);
        return;
      }

      setCreateFormError("");
      setUploadedSkillFileName(selectedFile.name);
      setUploadedSkillFileContent(content);
    } catch {
      setCreateFormError("Unable to read the uploaded skill.md file.");
      setUploadedSkillFileName("");
      setUploadedSkillFileContent("");
      setCreateFileInputKey((current) => current + 1);
    }
  }

  async function handleCreateAgentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateFormError("");

    const payload: CreateAgentPayload = {
      ...createForm,
      name: createForm.name.trim(),
      role: createForm.role.trim(),
      model: createForm.model.trim(),
      instructionContent: createForm.instructionContent.trim(),
      skillFileContent: uploadedSkillFileContent.trim() || undefined
    };

    if (!payload.name || !payload.role || !payload.model || !payload.instructionContent) {
      setCreateFormError("Please fill in all required fields.");
      return;
    }

    setIsCreatingAgent(true);

    try {
      const created = await createAgent(payload);
      setAgents((current) => [created, ...current]);
      setCreateForm(DEFAULT_AGENT_FORM);
      setUploadedSkillFileName("");
      setUploadedSkillFileContent("");
      setCreateFileInputKey((current) => current + 1);
      setIsCreatePanelOpen(false);
    } catch (error) {
      setCreateFormError(toErrorMessage(error));
    } finally {
      setIsCreatingAgent(false);
    }
  }

  function handleCreateCancel() {
    setCreateForm(DEFAULT_AGENT_FORM);
    setUploadedSkillFileName("");
    setUploadedSkillFileContent("");
    setCreateFileInputKey((current) => current + 1);
    setCreateFormError("");
    setIsCreatePanelOpen(false);
  }

  function openAgentDetail(agentId: string) {
    navigate(`/app/agents/${agentId}`);
  }

  function handleCardKeyDown(agentId: string, event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openAgentDetail(agentId);
    }
  }

  return (
    <div className={isSidebarCollapsed ? "app-page-shell is-sidebar-collapsed" : "app-page-shell"}>
      <AppTopBar
        collapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed((current) => !current)}
      />
      <AppSidebar collapsed={isSidebarCollapsed} />

      <div className="app-page-content agents-main agent-page-enter">
        <header className="agents-topbar">
          <div>
            <p className="agents-eyebrow">Agent Management</p>
            <h1>View and manage your agents</h1>
          </div>

          <div className="agents-create-disclosure">
            <button
              type="button"
              className="agents-create-button"
              onClick={() => setIsCreatePanelOpen((current) => !current)}
              title="Create new agent"
            >
              + Create agent
            </button>

            {isCreatePanelOpen ? (
              <>
                <button
                  type="button"
                  className="agents-modal-backdrop"
                  aria-label="Close create agent dialog"
                  onClick={handleCreateCancel}
                />

                <section className="agents-create-panel" aria-labelledby="create-agent-title" aria-modal="true" role="dialog">
                  <div className="agents-panel-header">
                    <h2 id="create-agent-title">Create new agent</h2>
                    <p>Configure identity and behavior for this agent.</p>
                  </div>

                  <form className="agent-form" onSubmit={handleCreateAgentSubmit}>
                    <label>
                      Agent name
                      <input type="text" name="name" value={createForm.name} onChange={handleCreateFieldChange} placeholder="Example: Customer-Support-Agent" disabled={isCreatingAgent} required />
                    </label>

                    <label>
                      Role
                      <input type="text" name="role" value={createForm.role} onChange={handleCreateFieldChange} placeholder="Example: Support Specialist" disabled={isCreatingAgent} required />
                    </label>

                    <label>
                      Model
                      <select name="model" value={createForm.model} onChange={handleCreateFieldChange} disabled={isCreatingAgent}>
                        <option value="gpt-4o-mini">gpt-4o-mini</option>
                        <option value="gpt-4.1">gpt-4.1</option>
                        <option value="gpt-4.1-mini">gpt-4.1-mini</option>
                      </select>
                    </label>

                    <label>
                      Instruction
                      <textarea name="instruction" rows={5} value={createForm.instructionContent} onChange={handleCreateFieldChange} placeholder="Define what the agent should do, constraints, and output format." disabled={isCreatingAgent} required />
                    </label>

                    <label>
                      Status
                      <select name="status" value={createForm.status} onChange={handleCreateFieldChange} disabled={isCreatingAgent}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </label>

                    <label>
                      Optional skill.md
                      <input key={createFileInputKey} type="file" accept=".md,text/markdown" onChange={(event) => void handleCreateSkillFileChange(event)} disabled={isCreatingAgent} />
                    </label>

                    <p className="agents-form-hint">
                      {uploadedSkillFileName
                        ? `Using uploaded file: ${uploadedSkillFileName}`
                        : "If no skill.md is uploaded, the system will generate a default one from the form values."}
                    </p>

                    {createFormError ? <p className="agents-list-state agents-list-state--error">{createFormError}</p> : null}

                    <div className="agent-form-actions">
                      <button type="button" className="btn-secondary" onClick={handleCreateCancel} disabled={isCreatingAgent}>Cancel</button>
                      <button type="submit" className="btn-primary" disabled={isCreatingAgent}>
                        {isCreatingAgent ? "Creating..." : "Create agent"}
                      </button>
                    </div>
                  </form>
                </section>
              </>
            ) : null}
          </div>
        </header>

        <section className="agents-panel agents-list-panel" aria-labelledby="my-agents-title">
          <div className="agents-panel-header">
            <h2 id="my-agents-title">My agents</h2>
            <p>{isLoadingAgents ? "Loading..." : `${agents.length} agent(s)`}</p>
          </div>

          <div className="agents-list">
            {isLoadingAgents ? (
              <p className="agents-list-state">Loading agents...</p>
            ) : agentsError ? (
              <p className="agents-list-state agents-list-state--error">{agentsError}</p>
            ) : agents.length === 0 ? (
              <p className="agents-list-state">No agents found in workspace.</p>
            ) : (
              agents.map((agent) => {
                return (
                  <article
                    className="agent-card agent-card--clickable"
                    key={agent.id}
                    onClick={() => openAgentDetail(agent.id)}
                    onKeyDown={(event) => handleCardKeyDown(agent.id, event)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="agent-card-header">
                      <div>
                        <h3>{agent.name}</h3>
                        <p>{agent.model}</p>
                        <p className="agent-card-role">{agent.role}</p>
                      </div>

                      <div className="agent-card-actions-wrapper agent-card-actions-wrapper--summary">
                        <span className={`agent-status ${agent.status === "active" ? "status-active" : "status-inactive"}`}>
                          {toStatusLabel(agent.status)}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import type { Agent, Workspace } from "@ai-agent-platform/shared";
import { createAgent, listAgents, type AgentListSortBy } from "../api/agentApi";
import { saveActiveWorkspaceId } from "../../workspace-management/api/workspaceContext";
import { listWorkspaces } from "../../workspace-management/api/workspaceApi";

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

const AGENTS_PAGE_SIZE = 5;
const MODEL_FILTER_ALL = "all";
const KNOWN_AGENT_MODELS = ["gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini"];
const PENDING_OPEN_CREATE_AGENT_KEY = "ai-agent-platform.pending-open-create-agent";

type ToolbarDropdownOption = {
  value: string;
  label: string;
};

interface ToolbarDropdownProps {
  label: string;
  options: ToolbarDropdownOption[];
  selectedValue: string;
  onSelect: (nextValue: string) => void;
}

function ToolbarDropdown(props: ToolbarDropdownProps) {
  const { label, options, selectedValue, onSelect } = props;
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleOutsideClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (!containerRef.current?.contains(target)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const selectedOption = options.find((option) => option.value === selectedValue);

  return (
    <div className="agents-list-toolbar-item agents-toolbar-dropdown" ref={containerRef}>
      <span>{label}</span>

      <button
        type="button"
        className={`agents-toolbar-dropdown-trigger ${isOpen ? "is-open" : ""}`}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>{selectedOption?.label ?? "Select"}</span>
        <span className={`agents-toolbar-dropdown-caret ${isOpen ? "is-open" : ""}`} aria-hidden="true">⌄</span>
      </button>

      <div className={`agents-toolbar-dropdown-menu ${isOpen ? "is-open" : ""}`} role="listbox" aria-label={label}>
        {options.map((option) => {
          const isSelected = option.value === selectedValue;

          return (
            <button
              key={option.value}
              type="button"
              className={`agents-toolbar-dropdown-option ${isSelected ? "is-selected" : ""}`}
              onClick={() => {
                onSelect(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function toStatusLabel(status: Agent["status"]): string {
  return status[0].toUpperCase() + status.slice(1);
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Request failed.";
}

interface AgentsQueryState {
  workspaceId: string;
  searchKeyword: string;
  modelFilter: string;
  sortBy: AgentListSortBy;
  sortOrder: "asc" | "desc";
  page: number;
}

function parseAgentsQueryParams(searchParams: URLSearchParams): AgentsQueryState {
  const workspaceId = searchParams.get("workspaceId") ?? "";
  const searchKeyword = searchParams.get("q") ?? "";
  const modelFilter = searchParams.get("model") ?? MODEL_FILTER_ALL;

  const sortByParam = searchParams.get("sortBy");
  const sortBy: AgentListSortBy = sortByParam === "role" || sortByParam === "model" ? sortByParam : "name";

  const sortOrder: "asc" | "desc" = searchParams.get("sortOrder") === "desc" ? "desc" : "asc";

  const pageParam = Number(searchParams.get("page"));
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;

  return { workspaceId, searchKeyword, modelFilter, sortBy, sortOrder, page };
}

function buildAgentsQueryParams(query: AgentsQueryState): URLSearchParams {
  const params = new URLSearchParams();

  if (query.workspaceId) {
    params.set("workspaceId", query.workspaceId);
  }
  if (query.searchKeyword) {
    params.set("q", query.searchKeyword);
  }
  if (query.modelFilter !== MODEL_FILTER_ALL) {
    params.set("model", query.modelFilter);
  }
  if (query.sortBy !== "name") {
    params.set("sortBy", query.sortBy);
  }
  if (query.sortOrder !== "asc") {
    params.set("sortOrder", query.sortOrder);
  }
  if (query.page > 1) {
    params.set("page", String(query.page));
  }

  return params;
}

export function AgentManagementPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialQueryState] = useState<AgentsQueryState>(() => parseAgentsQueryParams(searchParams));
  const [agents, setAgents] = useState<Agent[]>([]);
  const [totalAgents, setTotalAgents] = useState(0);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [isRefreshingAgents, setIsRefreshingAgents] = useState(false);
  const [hasSearchedAgents, setHasSearchedAgents] = useState(false);
  const [agentsError, setAgentsError] = useState("");
  const [currentPage, setCurrentPage] = useState(initialQueryState.page);
  const [workspaceOptions, setWorkspaceOptions] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(initialQueryState.workspaceId);
  const [draftSearchInput, setDraftSearchInput] = useState(initialQueryState.searchKeyword);
  const [draftModelFilter, setDraftModelFilter] = useState(initialQueryState.modelFilter);
  const [draftSortBy, setDraftSortBy] = useState<AgentListSortBy>(initialQueryState.sortBy);
  const [draftSortOrder, setDraftSortOrder] = useState<"asc" | "desc">(initialQueryState.sortOrder);
  const [appliedQuery, setAppliedQuery] = useState<{
    workspaceId: string;
    searchKeyword: string;
    modelFilter: string;
    sortBy: AgentListSortBy;
    sortOrder: "asc" | "desc";
  } | null>(
    initialQueryState.workspaceId
      ? {
          workspaceId: initialQueryState.workspaceId,
          searchKeyword: initialQueryState.searchKeyword,
          modelFilter: initialQueryState.modelFilter,
          sortBy: initialQueryState.sortBy,
          sortOrder: initialQueryState.sortOrder
        }
      : null
  );
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [modelOptions, setModelOptions] = useState<string[]>(KNOWN_AGENT_MODELS);

  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [createForm, setCreateForm] = useState<AgentFormValues>(DEFAULT_AGENT_FORM);
  const [uploadedSkillFileName, setUploadedSkillFileName] = useState("");
  const [uploadedSkillFileContent, setUploadedSkillFileContent] = useState("");
  const [createFileInputKey, setCreateFileInputKey] = useState(0);
  const [createFormError, setCreateFormError] = useState("");
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [searchToastMessage, setSearchToastMessage] = useState("");
  const [isSearchToastVisible, setIsSearchToastVisible] = useState(false);
  const [isSearchToastClosing, setIsSearchToastClosing] = useState(false);
  const latestAgentsRequestIdRef = useRef(0);

  const totalPages = Math.max(1, Math.ceil(totalAgents / AGENTS_PAGE_SIZE));

  useEffect(() => {
    if (initialQueryState.workspaceId) {
      saveActiveWorkspaceId(initialQueryState.workspaceId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function bootstrapWorkspaces() {
      try {
        const all = await listWorkspaces();
        setWorkspaceOptions(all);
      } catch {
        setWorkspaceOptions([]);
      }
    }

    void bootstrapWorkspaces();
  }, []);

  useEffect(() => {
    if (!appliedQuery?.workspaceId) {
      return;
    }

    const query = appliedQuery;
    const requestId = latestAgentsRequestIdRef.current + 1;
    latestAgentsRequestIdRef.current = requestId;

    async function bootstrapAgents() {
      if (hasSearchedAgents) {
        setIsRefreshingAgents(true);
      } else {
        setIsLoadingAgents(true);
      }
      setAgentsError("");

      try {
        const response = await listAgents("member", {
          workspaceId: query.workspaceId,
          page: currentPage,
          pageSize: AGENTS_PAGE_SIZE,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
          model: query.modelFilter === MODEL_FILTER_ALL ? undefined : query.modelFilter,
          search: query.searchKeyword || undefined
        });

        if (requestId !== latestAgentsRequestIdRef.current) {
          return;
        }

        setAgents(response.items);
        setTotalAgents(response.total);
        setHasSearchedAgents(true);

        setModelOptions((current) => {
          const discoveredModels = response.items.map((agent) => agent.model.trim()).filter(Boolean);
          return Array.from(new Set([...KNOWN_AGENT_MODELS, ...current, ...discoveredModels])).sort();
        });

        const normalizedTotalPages = Math.max(1, Math.ceil(response.total / AGENTS_PAGE_SIZE));
        if (currentPage > normalizedTotalPages) {
          setCurrentPage(normalizedTotalPages);
        }
      } catch (error) {
        if (requestId !== latestAgentsRequestIdRef.current) {
          return;
        }

        setAgentsError(toErrorMessage(error));
        setAgents([]);
        setTotalAgents(0);
      } finally {
        if (requestId === latestAgentsRequestIdRef.current) {
          setIsLoadingAgents(false);
          setIsRefreshingAgents(false);
        }
      }
    }

    void bootstrapAgents();
  }, [appliedQuery, currentPage, refreshCounter]);

  useEffect(() => {
    const nextParams = buildAgentsQueryParams({
      workspaceId: appliedQuery?.workspaceId ?? "",
      searchKeyword: appliedQuery?.searchKeyword ?? "",
      modelFilter: appliedQuery?.modelFilter ?? MODEL_FILTER_ALL,
      sortBy: appliedQuery?.sortBy ?? "name",
      sortOrder: appliedQuery?.sortOrder ?? "asc",
      page: currentPage
    });

    setSearchParams(nextParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedQuery, currentPage]);

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

  useEffect(() => {
    function handleOpenCreateAgent() {
      setIsCreatePanelOpen(true);
    }

    window.addEventListener("app:open-create-agent", handleOpenCreateAgent);

    return () => {
      window.removeEventListener("app:open-create-agent", handleOpenCreateAgent);
    };
  }, []);

  useEffect(() => {
    if (window.sessionStorage.getItem(PENDING_OPEN_CREATE_AGENT_KEY) !== "true") {
      return;
    }

    setIsCreatePanelOpen(true);
    window.sessionStorage.removeItem(PENDING_OPEN_CREATE_AGENT_KEY);
  }, []);

  useEffect(() => {
    if (!isSearchToastVisible || isSearchToastClosing) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsSearchToastClosing(true);
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isSearchToastClosing, isSearchToastVisible]);

  useEffect(() => {
    if (!isSearchToastClosing) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsSearchToastVisible(false);
      setIsSearchToastClosing(false);
      setSearchToastMessage("");
    }, 180);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isSearchToastClosing]);

  function showSearchToast(message: string) {
    setSearchToastMessage(message);
    setIsSearchToastVisible(true);
    setIsSearchToastClosing(false);
  }

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
      await createAgent(payload);
      setCreateForm(DEFAULT_AGENT_FORM);
      setUploadedSkillFileName("");
      setUploadedSkillFileContent("");
      setCreateFileInputKey((current) => current + 1);
      setIsCreatePanelOpen(false);
      setCurrentPage(1);
      setRefreshCounter((current) => current + 1);
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
    navigate(`/app/agents/${agentId}`, {
      state: { fromAgentsListUrl: `${location.pathname}${location.search}` }
    });
  }

  function handleCardKeyDown(agentId: string, event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openAgentDetail(agentId);
    }
  }

  function handleModelFilterChange(nextValue: string) {
    setDraftModelFilter(nextValue || MODEL_FILTER_ALL);
  }

  function handleSortByChange(nextValue: string) {
    const nextSortBy = nextValue as AgentListSortBy;
    setDraftSortBy(nextSortBy);
  }

  function handleToggleSortOrder() {
    setDraftSortOrder((current) => (current === "asc" ? "desc" : "asc"));
  }

  function handleSearchAgents() {
    if (isLoadingAgents || isRefreshingAgents) {
      return;
    }

    const workspaceId = selectedWorkspaceId.trim();

    if (!workspaceId) {
      showSearchToast("Please select a workspace before searching agents.");
      return;
    }

    const nextQuery = {
      workspaceId,
      searchKeyword: draftSearchInput.trim(),
      modelFilter: draftModelFilter,
      sortBy: draftSortBy,
      sortOrder: draftSortOrder
    };

    const isDuplicateQuery =
      appliedQuery !== null &&
      appliedQuery.workspaceId === nextQuery.workspaceId &&
      appliedQuery.searchKeyword === nextQuery.searchKeyword &&
      appliedQuery.modelFilter === nextQuery.modelFilter &&
      appliedQuery.sortBy === nextQuery.sortBy &&
      appliedQuery.sortOrder === nextQuery.sortOrder;

    if (isDuplicateQuery && currentPage === 1) {
      return;
    }

    saveActiveWorkspaceId(workspaceId);
    setAgentsError("");

    if (isDuplicateQuery) {
      setCurrentPage(1);
      return;
    }

    setCurrentPage(1);
    setAppliedQuery(nextQuery);
  }

  function goToPreviousPage() {
    setCurrentPage((current) => Math.max(1, current - 1));
  }

  function goToNextPage() {
    setCurrentPage((current) => Math.min(totalPages, current + 1));
  }

  const createAgentDialog =
    isCreatePanelOpen && typeof document !== "undefined"
      ? createPortal(
          <>
            <div
              className="agents-modal-backdrop"
              aria-hidden="true"
            />

            <section className="agents-create-panel" aria-labelledby="create-agent-title" aria-modal="true" role="dialog">
              <div className="agents-create-panel-header">
                <div className="agents-create-panel-heading">
                  <h2 id="create-agent-title">Create new agent</h2>
                  <p>Configure identity and behavior for this agent.</p>
                </div>

                <button
                  type="button"
                  className="agents-create-panel-close"
                  aria-label="Close create agent dialog"
                  onClick={handleCreateCancel}
                  disabled={isCreatingAgent}
                >
                  ×
                </button>
              </div>

              <div className="agents-create-panel-body">
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
              </div>
            </section>
          </>,
          document.body
        )
      : null;

  return (
    <div className="agents-main agent-page-enter">
      <header className="agents-topbar">
        <div>
          <p className="agents-eyebrow">Agent Management</p>
          <h1>View and manage your agents</h1>
          <p className="agents-heading-description">
            Create, inspect, and maintain the agents available to your workspace.
          </p>
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

          {createAgentDialog}
        </div>
      </header>

      <div className="agents-list-shell">
        <section className="agents-list-panel" aria-labelledby="my-agents-title">
          <div className="agents-panel-header">
            <h2 id="my-agents-title">My agents</h2>
            {hasSearchedAgents ? <p>{`${totalAgents} agent(s)${isRefreshingAgents ? " • Updating..." : ""}`}</p> : null}
          </div>

          <div className="agents-list-toolbar" role="region" aria-label="Agent list tools">
            <div className="agents-list-toolbar-primary">
              <ToolbarDropdown
                label="Workspace (required)"
                selectedValue={selectedWorkspaceId}
                onSelect={setSelectedWorkspaceId}
                options={[
                  { value: "", label: "Select workspace" },
                  ...workspaceOptions.map((workspace) => ({ value: workspace.id, label: workspace.name }))
                ]}
              />

              <div className="agents-list-toolbar-item agents-toolbar-search-action">
                <button
                  type="button"
                  className="btn-primary agents-toolbar-search-button"
                  onClick={handleSearchAgents}
                  disabled={isLoadingAgents || isRefreshingAgents}
                >
                  Search
                </button>
              </div>
            </div>

            <div className="agents-list-toolbar-secondary">
              <label className="agents-list-toolbar-item agents-search-field">
                <span>Search</span>
                <input
                  type="search"
                  value={draftSearchInput}
                  onChange={(event) => setDraftSearchInput(event.target.value)}
                  placeholder="Search agent name"
                />
              </label>

              <ToolbarDropdown
                label="Model"
                selectedValue={draftModelFilter}
                onSelect={handleModelFilterChange}
                options={[
                  { value: MODEL_FILTER_ALL, label: "All models" },
                  ...modelOptions.map((model) => ({ value: model, label: model }))
                ]}
              />

              <ToolbarDropdown
                label="Sort by"
                selectedValue={draftSortBy}
                onSelect={handleSortByChange}
                options={[
                  { value: "name", label: "Name" },
                  { value: "role", label: "Role" },
                  { value: "model", label: "Model" }
                ]}
              />

              <div className="agents-list-toolbar-item agents-sort-order-control">
                <span>Order</span>

                <button
                  type="button"
                  className="agents-sort-order-button"
                  onClick={handleToggleSortOrder}
                  aria-label={draftSortOrder === "asc" ? "Switch to descending sort order" : "Switch to ascending sort order"}
                  title={draftSortOrder === "asc" ? "Ascending" : "Descending"}
                >
                  <span
                    className={`agents-sort-order-icon ${draftSortOrder === "desc" ? "is-desc" : "is-asc"}`}
                    aria-hidden="true"
                  >
                    ↑
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="agents-list">
            {isLoadingAgents ? (
              <p className="agents-list-state">Loading agents...</p>
            ) : agentsError ? (
              <p className="agents-list-state agents-list-state--error">{agentsError}</p>
            ) : !hasSearchedAgents ? null : totalAgents === 0 ? (
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

          {hasSearchedAgents && totalAgents > 0 ? (
            <div className="agents-pagination" aria-label="Agents pagination">
              <button
                type="button"
                className="btn-secondary"
                onClick={goToPreviousPage}
                disabled={isLoadingAgents || currentPage <= 1}
              >
                Previous
              </button>

              <p>
                Page {currentPage} / {totalPages}
              </p>

              <button
                type="button"
                className="btn-secondary"
                onClick={goToNextPage}
                disabled={isLoadingAgents || currentPage >= totalPages}
              >
                Next
              </button>
            </div>
          ) : null}
        </section>
      </div>

      {isSearchToastVisible ? (
        <div className={`agents-toast ${isSearchToastClosing ? "is-closing" : "is-open"}`} role="status" aria-live="polite">
          <p>{searchToastMessage}</p>
        </div>
      ) : null}
    </div>
  );
}
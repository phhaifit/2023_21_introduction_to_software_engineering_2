import { useEffect, useMemo, useState, useRef } from "react";
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

interface CalendarEvent {
  id: string;
  title: string;
  dateTime: string;
  type: 'meeting' | 'task' | 'deadline';
}

const mockEvents: CalendarEvent[] = [
  { id: "cal-1", title: "Project Alignment Meeting", dateTime: "08/07/2026 - 10:00", type: "meeting" },
  { id: "cal-2", title: "Code Review & Refactoring", dateTime: "09/07/2026 - 14:00", type: "task" },
  { id: "cal-3", title: "Client Demo: Phase 1 Release", dateTime: "10/07/2026 - 09:00", type: "deadline" },
  { id: "cal-4", title: "Weekly Team Sync Session", dateTime: "10/07/2026 - 16:00", type: "meeting" }
];

interface StatItem {
  id: string;
  title: string;
  value: string;
  category: 'performance' | 'resource' | 'billing';
}

const mockStats: StatItem[] = [
  { id: "stat-1", title: "Task Success Rate", value: "98%", category: "performance" },
  { id: "stat-2", title: "Average Response Time", value: "1.2s", category: "performance" },
  { id: "stat-3", title: "Agent CPU Utilization", value: "42%", category: "resource" },
  { id: "stat-4", title: "Active Collaboration Teams", value: "3 Teams", category: "resource" },
  { id: "stat-5", title: "API Cost This Month", value: "$124.50", category: "billing" }
];

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
  const [activeTab, setActiveTab] = useState<'tasks' | 'calendar' | 'statistics'>('tasks');
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<CalendarEvent | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date(2026, 6, 7)); // July 7, 2026 anchor
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("2026-07-07");
  const [newTime, setNewTime] = useState("10:00");
  const [newType, setNewType] = useState<'meeting' | 'task' | 'deadline'>('meeting');
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("theme") as "light" | "dark") || "dark";
  });

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedTask, selectedTask?.messages?.length]);

  const [alwaysShow, setAlwaysShow] = useState<boolean>(() => {
    return localStorage.getItem("alwaysShowDetails") === "true";
  });
  const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({});
  const [isRecentTasksExpanded, setIsRecentTasksExpanded] = useState(true);
  const [isCalendarsExpanded, setIsCalendarsExpanded] = useState(true);
  const [isStatisticsExpanded, setIsStatisticsExpanded] = useState(true);
 
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(() => {
    const saved = localStorage.getItem("calendarEvents");
    if (saved) return JSON.parse(saved);
    return mockEvents;
  });

  const saveCalendarEvents = (events: CalendarEvent[]) => {
    setCalendarEvents(events);
    localStorage.setItem("calendarEvents", JSON.stringify(events));
  };

  const [statistics, setStatistics] = useState<StatItem[]>(() => {
    const saved = localStorage.getItem("platformStatistics");
    if (saved) return JSON.parse(saved);
    return mockStats;
  });

  const saveStatistics = (stats: StatItem[]) => {
    setStatistics(stats);
    localStorage.setItem("platformStatistics", JSON.stringify(stats));
  };

  const applyCalendarActions = (actions: any[]) => {
    let updatedEvents = [...calendarEvents];
    let updatedStats = [...statistics];
    let eventsChanged = false;
    let statsChanged = false;

    actions.forEach((act) => {
      if (act.action === "add" && act.event) {
        const newEvt: CalendarEvent = {
          id: act.event.id || `cal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: act.event.title || "Untitled Event",
          dateTime: act.event.dateTime || new Date().toLocaleString(),
          type: act.event.type || "meeting"
        };
        updatedEvents.push(newEvt);
        eventsChanged = true;
      } else if (act.action === "delete") {
        const titleToMatch = act.event?.title?.toLowerCase() || "";
        const dateToMatch = act.event?.dateTime || "";
        const originalLength = updatedEvents.length;
        updatedEvents = updatedEvents.filter((evt) => {
          const titleMatches = titleToMatch && evt.title.toLowerCase().includes(titleToMatch);
          const dateMatches = dateToMatch && evt.dateTime.includes(dateToMatch);
          if (titleToMatch && dateToMatch) {
            return !(titleMatches && dateMatches);
          }
          return !(titleMatches || dateMatches);
        });
        if (updatedEvents.length !== originalLength) {
          eventsChanged = true;
        }
      } else if (act.action === "reschedule" && act.event) {
        const titleToMatch = act.event.title?.toLowerCase() || "";
        updatedEvents = updatedEvents.map((evt) => {
          if (titleToMatch && evt.title.toLowerCase().includes(titleToMatch)) {
            eventsChanged = true;
            return {
              ...evt,
              dateTime: act.event.dateTime || evt.dateTime
            };
          }
          return evt;
        });
      } else if (act.action === "updateStat" && act.stat) {
        const titleToMatch = act.stat.title?.toLowerCase() || "";
        updatedStats = updatedStats.map((s) => {
          if (titleToMatch && s.title.toLowerCase().includes(titleToMatch)) {
            statsChanged = true;
            return {
              ...s,
              value: act.stat.value || s.value
            };
          }
          return s;
        });
      }
    });

    if (eventsChanged) {
      saveCalendarEvents(updatedEvents);
    }
    if (statsChanged) {
      saveStatistics(updatedStats);
    }
  };

  const handleCalendarAction = (action: "schedule" | "reschedule" | "delete", event: CalendarEvent) => {
    let text = "";
    if (action === "schedule") {
      text = `Please schedule the meeting "${event.title}" on ${event.dateTime} into my free hours.`;
    } else if (action === "reschedule") {
      text = `Please reschedule the event "${event.title}" currently at ${event.dateTime} to next week.`;
    } else if (action === "delete") {
      text = `Please delete/cancel the calendar event "${event.title}" scheduled on ${event.dateTime}.`;
    }
    setPrompt(text);
  };

  const handleStatAction = (action: "report" | "optimize", stat: StatItem) => {
    let text = "";
    if (action === "report") {
      text = `Please compile a summary report analyzing the "${stat.title}" which is currently ${stat.value}.`;
    } else if (action === "optimize") {
      text = `Analyze the current "${stat.title}" (${stat.value}) and propose a detailed optimization plan.`;
    }
    setPrompt(text);
  };

  const toggleExpand = (messageId: string) => {
    setExpandedMessages((prev) => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  const latestAssistantMessageId = useMemo(() => {
    if (!selectedTask?.messages) return null;
    const assistantMessages = selectedTask.messages.filter((m) => m.role === "assistant");
    return assistantMessages[assistantMessages.length - 1]?.id || null;
  }, [selectedTask?.messages]);

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
    if (!prompt.trim() || isSubmitting) return;

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const statsJson = JSON.stringify(statistics);
      const eventsJson = JSON.stringify(calendarEvents);
      const task = await submitTask({
        prompt,
        routingMode,
        targetId: routingMode === "workflow" ? selectedWorkflowId : routingMode === "agent" ? selectedAgentId : undefined,
        taskId: selectedTask ? selectedTask.id : undefined,
        currentStatistics: statsJson,
        currentEvents: eventsJson
      });
      setPrompt("");
      setSelectedTask(task);
      
      // Process calendar actions from the new response
      if (task.messages && task.messages.length > 0) {
        const latestMsg = task.messages[task.messages.length - 1];
        if (latestMsg && latestMsg.role === "assistant" && latestMsg.calendarActions) {
          applyCalendarActions(latestMsg.calendarActions);
        }
      }

      await loadConsole();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Cannot submit task");
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleNewTask = () => {
    setSelectedTask(null);
    setPrompt("");
    setErrorMessage("");
    setActiveTab('tasks');
  };

  const getEventsForDay = (day: number, currentMonthDate: Date) => {
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    const m = currentMonthDate.getMonth() + 1;
    const monthStr = m < 10 ? `0${m}` : `${m}`;
    const yearStr = currentMonthDate.getFullYear().toString();
    const datePattern = `${dayStr}/${monthStr}/${yearStr}`;
    return calendarEvents.filter(evt => evt.dateTime.includes(datePattern));
  };

  const handleOpenCreateModal = (day?: number) => {
    if (day !== undefined) {
      const y = currentDate.getFullYear();
      const m = currentDate.getMonth() + 1;
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      const monthStr = m < 10 ? `0${m}` : `${m}`;
      setNewDate(`${y}-${monthStr}-${dayStr}`);
    } else {
      const today = new Date();
      const y = today.getFullYear();
      const m = today.getMonth() + 1;
      const d = today.getDate();
      const dayStr = d < 10 ? `0${d}` : `${d}`;
      const monthStr = m < 10 ? `0${m}` : `${m}`;
      setNewDate(`${y}-${monthStr}-${dayStr}`);
    }
    setNewTitle("");
    setNewTime("10:00");
    setNewType("meeting");
    setIsCreateModalOpen(true);
  };

  const handleCreateEventDirect = (e: React.FormEvent) => {
    e.preventDefault();
    const parts = newDate.split("-");
    if (parts.length === 3) {
      const formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
      const dateTimeStr = `${formattedDate} - ${newTime}`;
      const newEvt: CalendarEvent = {
        id: `cal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: newTitle || "Untitled Event",
        dateTime: dateTimeStr,
        type: newType
      };
      const updated = [...calendarEvents, newEvt];
      saveCalendarEvents(updated);
      setIsCreateModalOpen(false);
      setNewTitle("");
    }
  };

  return (
    <div className={`task-orchestration-layout task-orchestration-layout--${theme}`}>
      {/* Sidebar - Far Left */}
      <aside className="task-sidebar">
        <button className="new-task-btn" onClick={handleNewTask} type="button">
          <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="16">
            <line x1="12" x2="12" y1="5" y2="19" />
            <line x1="5" x2="19" y1="12" y2="12" />
          </svg>
          New Task
        </button>

        <div className="sidebar-scrollable-area">
          {/* Recent Tasks Collapsible */}
          <button
            className="sidebar-section-toggle-btn"
            onClick={() => {
              setIsRecentTasksExpanded(!isRecentTasksExpanded);
              setActiveTab('tasks');
            }}
            type="button"
          >
            <span>Recent Tasks</span>
            <svg
              className={`chevron-icon ${isRecentTasksExpanded ? "chevron-icon--expanded" : ""}`}
              fill="none"
              height="10"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
              width="10"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {isRecentTasksExpanded && (
            <nav className="sidebar-task-list">
              {isLoading && consoleData.tasks.length === 0 ? (
                <p className="sidebar-muted">Loading tasks...</p>
              ) : null}
              {consoleData.tasks.map((task) => (
                <button
                  className={selectedTask?.id === task.id ? "sidebar-task-item sidebar-task-item--active" : "sidebar-task-item"}
                  key={task.id}
                  onClick={() => {
                    setSelectedTask(task);
                    setActiveTab('tasks');
                  }}
                  title={task.prompt}
                  type="button"
                >
                  <svg className="task-icon" fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="14">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <span className="task-prompt-text">{task.prompt}</span>
                  <span className={`task-badge task-badge--${task.status}`}>{statusLabel(task.status)}</span>
                </button>
              ))}
              {!isLoading && consoleData.tasks.length === 0 ? (
                <p className="sidebar-muted">No tasks submitted yet.</p>
              ) : null}
            </nav>
          )}

          {/* Calendars Sidebar Tab Link */}
          <button
            className={`sidebar-tab-btn ${activeTab === 'calendar' ? 'sidebar-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('calendar')}
            type="button"
            style={{ marginTop: "12px" }}
          >
            <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="14">
              <rect height="18" rx="2" ry="2" width="18" x="3" y="4" />
              <line x1="16" x2="16" y1="2" y2="6" />
              <line x1="8" x2="8" y1="2" y2="6" />
              <line x1="3" x2="21" y1="10" y2="10" />
            </svg>
            <span>Calendars</span>
          </button>

          {/* Statistics Sidebar Tab Link */}
          <button
            className={`sidebar-tab-btn ${activeTab === 'statistics' ? 'sidebar-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('statistics')}
            type="button"
            style={{ marginTop: "8px" }}
          >
            <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="14">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
            <span>Statistics</span>
          </button>
        </div>

        {/* Sidebar Metrics Panel */}
        <div className="sidebar-metrics">
          <div className="metric-box">
            <span className="metric-title">Active</span>
            <span className="metric-value">{consoleData.metrics.activeTasks}</span>
          </div>
          <div className="metric-box">
            <span className="metric-title">Completed</span>
            <span className="metric-value">{consoleData.metrics.completedTasks}</span>
          </div>
          <div className="metric-box">
            <span className="metric-title">Failed</span>
            <span className="metric-value">{consoleData.metrics.failedTasks}</span>
          </div>
          <div className="metric-box">
            <span className="metric-title">Success Rate</span>
            <span className="metric-value">{consoleData.metrics.successRate}%</span>
          </div>
        </div>
      </aside>

      {/* Main Chat Panel - Right Side */}
      <main className="task-main-chat">
        {/* Top Header */}
        <header className="chat-header">
          <div className="chat-header-title">
            {activeTab === 'tasks' ? (
              selectedTask ? (
                <>
                  <span>Running via: <strong>{selectedTask.targetName}</strong></span>
                  <span className="target-type-badge">{selectedTask.targetType}</span>
                </>
              ) : (
                <span>New Task Session</span>
              )
            ) : activeTab === 'calendar' ? (
              <span>Calendar Manager</span>
            ) : (
              <span>Statistics Hub</span>
            )}
          </div>
          


          <div className="chat-header-actions">
            <button className="theme-toggle-btn" onClick={toggleTheme} type="button" title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>
              {theme === "light" ? (
                <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="14">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="14">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" x2="12" y1="1" y2="3" />
                  <line x1="12" x2="12" y1="21" y2="23" />
                  <line x1="4.22" x2="5.64" y1="4.22" y2="5.64" />
                  <line x1="18.36" x2="19.78" y1="18.36" y2="19.78" />
                  <line x1="1" x2="3" y1="12" y2="12" />
                  <line x1="21" x2="23" y1="12" y2="12" />
                  <line x1="4.22" x2="5.64" y1="19.78" y2="18.36" />
                  <line x1="18.36" x2="19.78" y1="5.64" y2="4.22" />
                </svg>
              )}
              {theme === "light" ? "Dark Mode" : "Light Mode"}
            </button>

            <button className="refresh-btn" onClick={() => loadConsole()} type="button">
              <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="14">
                <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              Refresh
            </button>
          </div>
        </header>

        {activeTab === 'tasks' ? (
          <>
            {/* Chat Stream History */}
            <div className="chat-history-scroll">
              {!selectedTask ? (
                <div className="chat-welcome-screen">
                  <div className="welcome-logo">🤖</div>
                  <h1>Work Intake and Orchestration</h1>
                  <p>Describe your task and select an agent or workflow to execute it dynamically.</p>

                  <div className="starter-chips">
                    <button
                      onClick={() => setPrompt("Hãy lập kế hoạch phát triển (development timeline) trong 4 tuần cho một tính năng giỏ hàng của ứng dụng di động.")}
                      type="button"
                    >
                      Lập kế hoạch phát triển 4 tuần cho giỏ hàng
                    </button>
                    <button
                      onClick={() => setPrompt("Đánh giá rủi ro cho việc phát hành bản cập nhật database lớn của hệ thống ERP nội bộ.")}
                      type="button"
                    >
                      Đánh giá rủi ro release database ERP
                    </button>
                    <button
                      onClick={() => setPrompt("please delete all recent tasks")}
                      type="button"
                    >
                      Xóa tất cả các tác vụ gần đây (Clean console)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="chat-messages-list">
                  {selectedTask.messages && selectedTask.messages.length > 0 ? (
                    selectedTask.messages.map((message) => {
                      if (message.role === "user") {
                        return (
                          <div className="chat-msg chat-msg--user" key={message.id}>
                            <div className="chat-msg__avatar">U</div>
                            <div className="chat-msg__content">
                              <div className="chat-msg__sender">You</div>
                              <div className="chat-msg__text">{message.content}</div>
                            </div>
                          </div>
                        );
                      } else {
                        const isLatest = message.id === latestAssistantMessageId;
                        const hasDetails = message.summary || (selectedTask.collaborationContext && isLatest);
                        return (
                          <div className={`chat-msg chat-msg--assistant chat-msg--${message.error ? "failed" : "completed"}`} key={message.id}>
                            <div className="chat-msg__avatar">AI</div>
                            <div className="chat-msg__content">
                              <div className="chat-msg__sender">
                                {selectedTask.targetName}
                              </div>

                              {message.error ? (
                                <div className="chat-msg__error-box">
                                  <strong>Execution Failed</strong>
                                  <p>{message.error}</p>
                                </div>
                              ) : (
                                <>
                                  <div className="chat-msg__output-block">
                                    <strong>Execution Result</strong>
                                    <div className="markdown-output">
                                      {message.content ? (
                                        <pre className="raw-text-output">{message.content}</pre>
                                      ) : (
                                        <p className="no-output-text">No result content returned.</p>
                                      )}
                                    </div>
                                  </div>

                                  {hasDetails && (
                                    <div className="details-accordion-wrapper">
                                      <details
                                        className="chat-msg__details-accordion"
                                        open={alwaysShow || !!expandedMessages[message.id]}
                                      >
                                        <summary
                                          onClick={(e) => {
                                            if (alwaysShow) {
                                              e.preventDefault();
                                            } else {
                                              toggleExpand(message.id);
                                            }
                                          }}
                                        >
                                          View Summary and Shared Collaboration Context
                                        </summary>
                                        <div className="details-accordion-content">
                                          {message.summary && (
                                            <div className="chat-msg__summary-block">
                                              <strong>Summary</strong>
                                              <p>{message.summary}</p>
                                            </div>
                                          )}

                                          {selectedTask.collaborationContext && isLatest && (
                                            <div className="chat-msg__collaboration-block">
                                              <strong>Shared Collaboration Context</strong>
                                              <p>
                                                Coordinator: <code>{selectedTask.collaborationContext.coordinator}</code>.
                                                Participants: {selectedTask.collaborationContext.participants.map((p) => (
                                                  <code key={p}>{p}</code>
                                                ))}
                                              </p>
                                              {selectedTask.collaborationContext.handoffNotes && selectedTask.collaborationContext.handoffNotes.length > 0 && (
                                                <ul className="handoff-notes">
                                                  {selectedTask.collaborationContext.handoffNotes.map((note, index) => (
                                                    <li key={index}>{note}</li>
                                                  ))}
                                                </ul>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </details>
                                      <label className="always-show-checkbox-label">
                                        <input
                                          checked={alwaysShow}
                                          onChange={(e) => {
                                            setAlwaysShow(e.target.checked);
                                            localStorage.setItem("alwaysShowDetails", String(e.target.checked));
                                          }}
                                          type="checkbox"
                                        />
                                        Always show
                                      </label>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      }
                    })
                  ) : (
                    /* Fallback for tasks with no message history array */
                    <>
                      <div className="chat-msg chat-msg--user">
                        <div className="chat-msg__avatar">U</div>
                        <div className="chat-msg__content">
                          <div className="chat-msg__sender">You</div>
                          <div className="chat-msg__text">{selectedTask.prompt}</div>
                        </div>
                      </div>

                      <div className={`chat-msg chat-msg--assistant chat-msg--${selectedTask.status}`}>
                        <div className="chat-msg__avatar">AI</div>
                        <div className="chat-msg__content">
                          <div className="chat-msg__sender">
                            {selectedTask.targetName}
                            <span className="routing-mode-label">({selectedTask.routingMode} routing)</span>
                          </div>

                          {selectedTask.status === "failed" ? (
                            <div className="chat-msg__error-box">
                              <strong>Execution Failed</strong>
                              <p>{selectedTask.error}</p>
                            </div>
                          ) : (
                            <>
                              <div className="chat-msg__output-block">
                                <strong>Execution Result</strong>
                                <div className="markdown-output">
                                  {selectedTask.result ? (
                                    <pre className="raw-text-output">{selectedTask.result}</pre>
                                  ) : (
                                    <p className="no-output-text">No result content returned.</p>
                                  )}
                                </div>
                              </div>

                              {(selectedTask.resultSummary || selectedTask.collaborationContext) && (
                                <div className="details-accordion-wrapper">
                                  <details
                                    className="chat-msg__details-accordion"
                                    open={alwaysShow || !!expandedMessages["legacy"]}
                                  >
                                    <summary
                                      onClick={(e) => {
                                        if (alwaysShow) {
                                          e.preventDefault();
                                        } else {
                                          toggleExpand("legacy");
                                        }
                                      }}
                                    >
                                      View Summary and Shared Collaboration Context
                                    </summary>
                                    <div className="details-accordion-content">
                                      {selectedTask.resultSummary && (
                                        <div className="chat-msg__summary-block">
                                          <strong>Summary</strong>
                                          <p>{selectedTask.resultSummary}</p>
                                        </div>
                                      )}

                                      {selectedTask.collaborationContext && (
                                        <div className="chat-msg__collaboration-block">
                                          <strong>Shared Collaboration Context</strong>
                                          <p>
                                            Coordinator: <code>{selectedTask.collaborationContext.coordinator}</code>.
                                            Participants: {selectedTask.collaborationContext.participants.map((p) => (
                                              <code key={p}>{p}</code>
                                            ))}
                                          </p>
                                          {selectedTask.collaborationContext.handoffNotes && selectedTask.collaborationContext.handoffNotes.length > 0 && (
                                            <ul className="handoff-notes">
                                              {selectedTask.collaborationContext.handoffNotes.map((note, index) => (
                                                <li key={index}>{note}</li>
                                              ))}
                                            </ul>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </details>
                                  <label className="always-show-checkbox-label">
                                    <input
                                      checked={alwaysShow}
                                      onChange={(e) => {
                                        setAlwaysShow(e.target.checked);
                                        localStorage.setItem("alwaysShowDetails", String(e.target.checked));
                                      }}
                                      type="checkbox"
                                    />
                                    Always show
                                  </label>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Audit Trail Accordion (Task Level) */}
                  <div className="chat-msg chat-msg--system" style={{ marginTop: "-8px" }}>
                    <div className="chat-msg__avatar" style={{ visibility: "hidden" }}>A</div>
                    <div className="chat-msg__content">
                      <details className="chat-msg__audit-details">
                        <summary>Execution Audit Trail ({selectedTask.auditLog.length} steps)</summary>
                        <div className="audit-timeline">
                          {selectedTask.auditLog.map((audit) => (
                            <div className="audit-step" key={audit.id}>
                              <div className="audit-step__meta">
                                <span className="audit-step__title">{audit.title}</span>
                                <span className="audit-step__time">{new Date(audit.createdAt).toLocaleTimeString()}</span>
                              </div>
                              <p className="audit-step__detail">{audit.detail}</p>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  </div>

                  {/* Anchor for Auto Scroll */}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            {/* Floating Input Area at Bottom */}
            <footer className="chat-input-area">
              <form className="chat-composer-form" onSubmit={handleSubmit}>
                {/* Target Selectors Controls Row */}
                <div className="composer-selectors-row">
                  <div className="routing-selectors">
                    {routingModes.map((mode) => (
                      <button
                        className={routingMode === mode.value ? "routing-selector-btn routing-selector-btn--active" : "routing-selector-btn"}
                        key={mode.value}
                        onClick={() => setRoutingMode(mode.value)}
                        type="button"
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>

                  {routingMode === "agent" && (
                    <select
                      className="composer-select"
                      onChange={(event) => setSelectedAgentId(event.target.value)}
                      value={selectedAgentId}
                    >
                      {consoleData.agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          Agent: {agent.name} ({agent.status})
                        </option>
                      ))}
                    </select>
                  )}

                  {routingMode === "workflow" && (
                    <select
                      className="composer-select"
                      onChange={(event) => setSelectedWorkflowId(event.target.value)}
                      value={selectedWorkflowId}
                    >
                      {consoleData.workflows.map((workflow) => (
                        <option key={workflow.id} value={workflow.id}>
                          Workflow: {workflow.name} ({workflow.status})
                        </option>
                      ))}
                    </select>
                  )}

                  {previewTarget && (
                    <div className="routing-preview-badge">
                      Target: <strong>{previewTarget.name}</strong>
                    </div>
                  )}
                </div>

                {/* Main Pill-shaped Textarea wrapper */}
                <div className="chat-input-box-wrapper">
                  <textarea
                    name="prompt"
                    onChange={(event) => setPrompt(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        if (prompt.trim() && !isSubmitting) {
                          handleSubmit(event as any);
                        }
                      }
                    }}
                    placeholder="Describe the task that should be routed to an agent, workflow, or team..."
                    rows={1}
                    value={prompt}
                  />
                  <button
                    className="chat-send-btn"
                    disabled={isSubmitting || !prompt.trim()}
                    type="submit"
                  >
                    {isSubmitting ? (
                      <span className="spinner"></span>
                    ) : (
                      <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" width="16">
                        <line x1="22" x2="11" y1="2" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    )}
                  </button>
                </div>

                {errorMessage && <div className="composer-error">{errorMessage}</div>}

                <p className="composer-footnote">
                  AI Agent Platform can make mistakes. Verify important outputs.
                </p>
              </form>
            </footer>
          </>
        ) : activeTab === 'calendar' ? (
          (() => {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const startDayOfWeek = new Date(year, month, 1).getDay();
            
            const prevMonthYear = month === 0 ? year - 1 : year;
            const prevMonth = month === 0 ? 11 : month - 1;
            const daysInPrevMonth = new Date(prevMonthYear, prevMonth + 1, 0).getDate();
            
            const paddingDays = Array.from({ length: startDayOfWeek }, (_, i) => {
              return daysInPrevMonth - startDayOfWeek + i + 1;
            });
            
            const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
            const totalGridCellsCount = paddingDays.length + monthDays.length;
            const totalTargetCells = totalGridCellsCount <= 35 ? 35 : 42;
            const remainingPaddingCells = totalTargetCells - totalGridCellsCount;
            const nextMonthDays = Array.from({ length: remainingPaddingCells }, (_, i) => i + 1);

            return (
              <div className="dashboard-view calendar-dashboard">
                {(isMonthDropdownOpen || isYearDropdownOpen) && (
                  <div 
                    className="dropdown-overlay-backplate" 
                    onClick={() => { setIsMonthDropdownOpen(false); setIsYearDropdownOpen(false); }} 
                  />
                )}
                <div className="calendar-top-bar">
                  <div className="calendar-nav-controls">
                    <div className="calendar-header-selectors">
                      {/* Custom Month Dropdown */}
                      <div className="custom-dropdown-container">
                        <button 
                          className="calendar-header-select calendar-header-select--month"
                          onClick={() => { setIsMonthDropdownOpen(!isMonthDropdownOpen); setIsYearDropdownOpen(false); }}
                          type="button"
                        >
                          {monthNames[month]}
                          <svg className="dropdown-trigger-chevron" fill="none" height="12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="12">
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </button>
                        {isMonthDropdownOpen && (
                          <div className="custom-dropdown-menu">
                            {monthNames.map((name, index) => (
                              <button
                                key={name}
                                className={`custom-dropdown-item ${month === index ? 'custom-dropdown-item--active' : ''}`}
                                onClick={() => {
                                  setCurrentDate(new Date(year, index, 1));
                                  setIsMonthDropdownOpen(false);
                                }}
                                type="button"
                              >
                                {name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Custom Year Dropdown */}
                      <div className="custom-dropdown-container">
                        <button 
                          className="calendar-header-select calendar-header-select--year"
                          onClick={() => { setIsYearDropdownOpen(!isYearDropdownOpen); setIsMonthDropdownOpen(false); }}
                          type="button"
                        >
                          {year}
                          <svg className="dropdown-trigger-chevron" fill="none" height="12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="12">
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </button>
                        {isYearDropdownOpen && (
                          <div className="custom-dropdown-menu custom-dropdown-menu--year">
                            {Array.from({ length: 21 }, (_, idx) => 2020 + idx).map(y => (
                              <button
                                key={y}
                                className={`custom-dropdown-item ${year === y ? 'custom-dropdown-item--active' : ''}`}
                                onClick={() => {
                                  setCurrentDate(new Date(y, month, 1));
                                  setIsYearDropdownOpen(false);
                                }}
                                type="button"
                              >
                                {y}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="calendar-btn-group">
                      <button 
                        className="calendar-nav-btn" 
                        onClick={() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                        type="button"
                      >
                        &lt;
                      </button>
                      <button 
                        className="calendar-nav-btn" 
                        onClick={() => setCurrentDate(new Date())} // Resets to real today date
                        type="button"
                      >
                        Today
                      </button>
                      <button 
                        className="calendar-nav-btn" 
                        onClick={() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                        type="button"
                      >
                        &gt;
                      </button>
                    </div>
                  </div>
                  <button 
                    className="calendar-create-btn"
                    onClick={() => handleOpenCreateModal()}
                    type="button"
                  >
                    ➕ Create Event
                  </button>
                </div>

                <div className="google-calendar-container">
                  {/* Day Headers */}
                  <div className="calendar-week-headers">
                    <div>Sun</div>
                    <div>Mon</div>
                    <div>Tue</div>
                    <div>Wed</div>
                    <div>Thu</div>
                    <div>Fri</div>
                    <div>Sat</div>
                  </div>

                  {/* Grid Days */}
                  <div className="calendar-month-grid">
                    {/* Padding cells from previous month */}
                    {paddingDays.map((d, index) => (
                      <div key={`prev-${index}`} className="grid-cell grid-cell--empty">
                        <span className="cell-day-num">{d}</span>
                      </div>
                    ))}

                    {/* Current Month Days */}
                    {monthDays.map((day) => {
                      const dayEvents = getEventsForDay(day, currentDate);
                      const isToday = day === 7 && month === 6 && year === 2026; // Anchored to July 7, 2026
                      return (
                        <div 
                          key={`day-${day}`} 
                          className={`grid-cell ${isToday ? 'grid-cell--today' : ''}`}
                          onClick={() => handleOpenCreateModal(day)}
                          style={{ cursor: "pointer" }}
                        >
                          <span className="cell-day-num">{day}</span>
                          <div className="cell-events-list">
                            {dayEvents.map(evt => (
                              <div 
                                key={evt.id} 
                                className={`event-pill event-pill--${evt.type}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCalendarEvent(evt);
                                }}
                                title={`${evt.title} (${evt.dateTime})`}
                              >
                                <span className="event-pill-time">{evt.dateTime.split(" - ")[1]}</span>
                                <span className="event-pill-title">{evt.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {/* Padding cells from next month */}
                    {nextMonthDays.map((d, index) => (
                      <div key={`next-${index}`} className="grid-cell grid-cell--empty">
                        <span className="cell-day-num">{d}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Event Details Popover/Modal */}
                {selectedCalendarEvent && (
                  <div className="calendar-popover-overlay" onClick={() => setSelectedCalendarEvent(null)}>
                    <div className="calendar-popover-card" onClick={(e) => e.stopPropagation()}>
                      <div className="popover-header">
                        <span className="card-event-badge" data-type={selectedCalendarEvent.type}>
                          {selectedCalendarEvent.type.toUpperCase()}
                        </span>
                        <button className="popover-close-btn" onClick={() => setSelectedCalendarEvent(null)} type="button">&times;</button>
                      </div>
                      <div className="popover-body">
                        <h3>{selectedCalendarEvent.title}</h3>
                        <p className="popover-time">📅 {selectedCalendarEvent.dateTime}</p>
                        <p className="popover-desc">Coordinated automatically via AI Orchestrator with host and attendee groups.</p>
                      </div>
                      <div className="popover-footer">
                        <button 
                          className="popover-btn popover-btn--schedule"
                          onClick={() => {
                            handleCalendarAction('schedule', selectedCalendarEvent);
                            setActiveTab('tasks');
                            setSelectedCalendarEvent(null);
                          }}
                          type="button"
                        >
                          Schedule slots
                        </button>
                        <button 
                          className="popover-btn popover-btn--reschedule"
                          onClick={() => {
                            handleCalendarAction('reschedule', selectedCalendarEvent);
                            setActiveTab('tasks');
                            setSelectedCalendarEvent(null);
                          }}
                          type="button"
                        >
                          Reschedule
                        </button>
                        <button 
                          className="popover-btn popover-btn--delete"
                          onClick={() => {
                            handleCalendarAction('delete', selectedCalendarEvent);
                            setActiveTab('tasks');
                            setSelectedCalendarEvent(null);
                          }}
                          type="button"
                        >
                          Cancel Event
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Direct Event Creator Modal */}
                {isCreateModalOpen && (
                  <div className="calendar-popover-overlay" onClick={() => setIsCreateModalOpen(false)}>
                    <div className="calendar-popover-card" onClick={(e) => e.stopPropagation()}>
                      <div className="popover-header">
                        <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: theme === "light" ? "#0f172a" : "#ffffff" }}>Create Event</h3>
                        <button className="popover-close-btn" onClick={() => setIsCreateModalOpen(false)} type="button">&times;</button>
                      </div>
                      <form onSubmit={handleCreateEventDirect} className="create-event-form">
                        <div className="form-group">
                          <label>Event Title</label>
                          <input
                            type="text"
                            required
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="e.g. Project Strategy Session"
                          />
                        </div>
                        <div className="form-group-row">
                          <div className="form-group">
                            <label>Date</label>
                            <input
                              type="date"
                              required
                              value={newDate}
                              onChange={(e) => setNewDate(e.target.value)}
                            />
                          </div>
                          <div className="form-group">
                            <label>Time</label>
                            <input
                              type="time"
                              required
                              value={newTime}
                              onChange={(e) => setNewTime(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="form-group">
                          <label>Event Type</label>
                          <select
                            value={newType}
                            onChange={(e) => setNewType(e.target.value as any)}
                          >
                            <option value="meeting">Meeting</option>
                            <option value="task">Task</option>
                            <option value="deadline">Deadline</option>
                          </select>
                        </div>
                        <div className="popover-footer" style={{ marginTop: "8px" }}>
                          <button className="popover-btn popover-btn--schedule" type="submit">Create Event</button>
                          <button className="popover-btn" type="button" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            );
          })()
        ) : (
          <div className="dashboard-view statistics-dashboard">
            <div className="dashboard-header">
              <h2>📊 Platform Statistics & Reports</h2>
              <p className="dashboard-subtitle">Real-time performance metrics, resource utilization, and API costing analytics.</p>
            </div>

            <div className="stats-premium-grid">
              {/* Card 1: Success Rate */}
              <div className="stat-premium-card stat-premium-card--success">
                <div className="card-top">
                  <span className="card-title">Task Success Rate</span>
                  <span className="card-badge">PERFORMANCE</span>
                </div>
                <div className="card-middle">
                  <div className="radial-progress-box">
                    <svg className="circular-chart" viewBox="0 0 36 36">
                      <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path className="circle" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" strokeDasharray="98, 100" />
                    </svg>
                    <span className="radial-val">{statistics.find(s => s.id === 'stat-1')?.value || '98%'}</span>
                  </div>
                </div>
                <div className="card-actions">
                  <button onClick={() => { handleStatAction('report', statistics[0]); setActiveTab('tasks'); }} type="button">📊 Report</button>
                  <button onClick={() => { handleStatAction('optimize', statistics[0]); setActiveTab('tasks'); }} type="button">⚙️ Optimize</button>
                </div>
              </div>

              {/* Card 2: Response Time */}
              <div className="stat-premium-card stat-premium-card--latency">
                <div className="card-top">
                  <span className="card-title">Avg. Latency</span>
                  <span className="card-badge font-sans">SPEED</span>
                </div>
                <div className="card-middle">
                  <span className="metric-large-value">{statistics.find(s => s.id === 'stat-2')?.value || '1.2s'}</span>
                  <span className="metric-trend text-up">▲ 0.1s faster</span>
                </div>
                <div className="card-actions">
                  <button onClick={() => { handleStatAction('report', statistics[1]); setActiveTab('tasks'); }} type="button">📊 Report</button>
                  <button onClick={() => { handleStatAction('optimize', statistics[1]); setActiveTab('tasks'); }} type="button">⚙️ Optimize</button>
                </div>
              </div>

              {/* Card 3: CPU utilization */}
              <div className="stat-premium-card stat-premium-card--cpu">
                <div className="card-top">
                  <span className="card-title">Agent CPU Load</span>
                  <span className="card-badge">RESOURCE</span>
                </div>
                <div className="card-middle">
                  <span className="metric-large-value">{statistics.find(s => s.id === 'stat-3')?.value || '42%'}</span>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: statistics.find(s => s.id === 'stat-3')?.value || '42%' }}></div>
                  </div>
                </div>
                <div className="card-actions">
                  <button onClick={() => { handleStatAction('report', statistics[2]); setActiveTab('tasks'); }} type="button">📊 Report</button>
                  <button onClick={() => { handleStatAction('optimize', statistics[2]); setActiveTab('tasks'); }} type="button">⚙️ Optimize</button>
                </div>
              </div>

              {/* Card 4: Collaboration Teams */}
              <div className="stat-premium-card stat-premium-card--teams">
                <div className="card-top">
                  <span className="card-title">Collaboration Teams</span>
                  <span className="card-badge">TEAMS</span>
                </div>
                <div className="card-middle">
                  <span className="metric-large-value">{statistics.find(s => s.id === 'stat-4')?.value || '3 Teams'}</span>
                  <span className="metric-trend">Nodes active</span>
                </div>
                <div className="card-actions">
                  <button onClick={() => { handleStatAction('report', statistics[3]); setActiveTab('tasks'); }} type="button">📊 Report</button>
                  <button onClick={() => { handleStatAction('optimize', statistics[3]); setActiveTab('tasks'); }} type="button">⚙️ Optimize</button>
                </div>
              </div>

              {/* Card 5: Cost */}
              <div className="stat-premium-card stat-premium-card--billing">
                <div className="card-top">
                  <span className="card-title">API Cost (Month)</span>
                  <span className="card-badge">BILLING</span>
                </div>
                <div className="card-middle">
                  <span className="metric-large-value">{statistics.find(s => s.id === 'stat-5')?.value || '$124.50'}</span>
                  <span className="metric-trend">Budget: $500.00 max</span>
                </div>
                <div className="card-actions">
                  <button onClick={() => { handleStatAction('report', statistics[4]); setActiveTab('tasks'); }} type="button">📊 Report</button>
                  <button onClick={() => { handleStatAction('optimize', statistics[4]); setActiveTab('tasks'); }} type="button">⚙️ Optimize</button>
                </div>
              </div>
            </div>

            <div className="stats-report-summary-box">
              <h3>📝 Planning Analyst Insights</h3>
              <p>
                Platform success rates remain highly stable at <strong>{statistics.find(s => s.id === 'stat-1')?.value || '98%'}</strong>. 
                API pricing factors are within normal parameters, showing a current monthly consumption of <strong>{statistics.find(s => s.id === 'stat-5')?.value || '$124.50'}</strong>. 
                Resource allocation is running optimally with CPU utilization balanced at <strong>{statistics.find(s => s.id === 'stat-3')?.value || '42%'}</strong> across active collaboration nodes.
              </p>
              <div className="summary-box-actions">
                <button
                  className="dashboard-action-btn"
                  onClick={() => {
                    setPrompt("Please compile a comprehensive operational status report with detailed chart data and performance forecasts.");
                    setActiveTab('tasks');
                  }}
                  type="button"
                >
                  Generate General Operational Report
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

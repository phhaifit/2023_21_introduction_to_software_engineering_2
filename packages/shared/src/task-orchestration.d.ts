export type TaskRoutingMode = "automatic" | "agent" | "workflow" | "multi-agent";
export type TaskTargetType = "agent" | "workflow";
export type TaskStatus = "queued" | "processing" | "completed" | "failed";
export type ExecutionTargetStatus = "online" | "offline";

export interface ExecutionTarget {
  id: string;
  name: string;
  type: TaskTargetType;
  status: ExecutionTargetStatus;
  capabilities: string[];
}

export interface TaskAuditLog {
  id: string;
  taskId: string;
  title: string;
  detail: string;
  createdAt: string;
}

export interface CollaborationContext {
  coordinator: string;
  participants: string[];
  sharedContext: string;
  handoffNotes: string[];
}

export interface TaskMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  summary?: string | null;
  error?: string | null;
  createdAt: string;
  calendarActions?: any[] | null;
}

export interface OrchestratedTask {
  id: string;
  workspaceId: string;
  requesterId: string;
  prompt: string;
  routingMode: TaskRoutingMode;
  targetType: TaskTargetType;
  targetId: string;
  targetName: string;
  status: TaskStatus;
  result: string | null;
  resultSummary: string | null;
  error: string | null;
  collaborationContext: CollaborationContext | null;
  createdAt: string;
  updatedAt: string;
  auditLog: TaskAuditLog[];
  messages?: TaskMessage[] | null;
}

export interface TaskConsole {
  agents: ExecutionTarget[];
  workflows: ExecutionTarget[];
  tasks: OrchestratedTask[];
  metrics: {
    activeTasks: number;
    completedTasks: number;
    failedTasks: number;
    successRate: number;
  };
}

export interface SubmitTaskInput {
  workspaceId?: string;
  requesterId?: string;
  prompt: string;
  routingMode: TaskRoutingMode;
  targetId?: string;
  taskId?: string;
  currentStatistics?: string;
  currentEvents?: string;
}

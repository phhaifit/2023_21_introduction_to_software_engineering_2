import type { OrchestratedTask, SubmitTaskInput, TaskConsole } from "@ai-agent-platform/shared";

const API_BASE_URL = "/api/task-orchestration";

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error ?? body.message ?? "Task orchestration request failed");
  }

  return body as T;
}

export async function fetchTaskConsole(): Promise<TaskConsole> {
  const response = await fetch(`${API_BASE_URL}/console`);
  return parseResponse<TaskConsole>(response);
}

export async function submitTask(input: SubmitTaskInput): Promise<OrchestratedTask> {
  const response = await fetch(`${API_BASE_URL}/tasks`, {
    body: JSON.stringify(input),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  return parseResponse<OrchestratedTask>(response);
}

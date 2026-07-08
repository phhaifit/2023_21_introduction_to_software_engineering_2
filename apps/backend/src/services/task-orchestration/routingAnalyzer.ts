import type { ExecutionTarget, TaskRoutingMode } from "@ai-agent-platform/shared";

export interface RoutingDecision {
  mode: TaskRoutingMode;
  target: ExecutionTarget;
  reason: string;
}

interface AnalyzeRoutingInput {
  prompt: string;
  routingMode: TaskRoutingMode;
  targetId?: string;
  agents: ExecutionTarget[];
  workflows: ExecutionTarget[];
}

function requireTarget(target: ExecutionTarget | undefined, message: string): ExecutionTarget {
  if (!target) {
    throw Object.assign(new Error(message), { statusCode: 422, code: "TARGET_REQUIRED" });
  }

  return target;
}

function firstOnline(targets: ExecutionTarget[]): ExecutionTarget | undefined {
  return targets.find((target) => target.status === "online") ?? targets[0];
}

export function analyzeRouting({
  prompt,
  routingMode,
  targetId,
  agents,
  workflows
}: AnalyzeRoutingInput): RoutingDecision {
  if (routingMode === "agent") {
    return {
      mode: routingMode,
      target: requireTarget(agents.find((agent) => agent.id === targetId), "A valid agent target is required."),
      reason: "The requester selected a specific execution agent."
    };
  }

  if (routingMode === "workflow") {
    return {
      mode: routingMode,
      target: requireTarget(workflows.find((workflow) => workflow.id === targetId), "A valid workflow target is required."),
      reason: "The requester selected a specific workflow."
    };
  }

  if (routingMode === "multi-agent") {
    return {
      mode: routingMode,
      target: requireTarget(
        agents.find((agent) => agent.capabilities.includes("multi-agent")) ?? firstOnline(agents),
        "No agent is available for multi-agent coordination."
      ),
      reason: "The task requires shared context and was routed to a coordinator agent."
    };
  }

  const normalizedPrompt = prompt.toLowerCase();

  if (["release", "deployment", "workflow", "approval", "quy trinh"].some((keyword) => normalizedPrompt.includes(keyword))) {
    return {
      mode: "automatic",
      target: requireTarget(firstOnline(workflows), "No workflow is available for automatic routing."),
      reason: "Automatic routing detected a multi-step workflow request."
    };
  }

  if (["multi-agent", "collaborate", "complex", "review", "phoi hop"].some((keyword) => normalizedPrompt.includes(keyword))) {
    return {
      mode: "automatic",
      target: requireTarget(
        agents.find((agent) => agent.capabilities.includes("multi-agent")) ?? firstOnline(agents),
        "No coordinator agent is available for automatic routing."
      ),
      reason: "Automatic routing detected a cross-capability task and selected the coordinator."
    };
  }

  return {
    mode: "automatic",
    target: requireTarget(firstOnline(agents), "No agent is available for automatic routing."),
    reason: "Automatic routing selected the best available planning agent."
  };
}

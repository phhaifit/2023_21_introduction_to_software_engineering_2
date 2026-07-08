import type { CollaborationContext, ExecutionTarget, TaskRoutingMode } from "@ai-agent-platform/shared";

interface BuildCollaborationContextInput {
  prompt: string;
  target: ExecutionTarget;
  agents: ExecutionTarget[];
  routingMode?: TaskRoutingMode;
}

export function buildCollaborationContext({
  prompt,
  target,
  agents,
  routingMode
}: BuildCollaborationContextInput): CollaborationContext | null {
  // If the user explicitly chose single agent/workflow execution, do not collaborate
  if (routingMode === "agent" || routingMode === "workflow") {
    return null;
  }

  const participants = agents
    .filter((agent) => agent.status === "online")
    .slice(0, 3)
    .map((agent) => agent.name);

  // Collaboration only runs on agent targets that have multi-agent coordination capabilities
  if (target.type !== "agent" || !target.capabilities.includes("multi-agent")) {
    return null;
  }

  return {
    coordinator: target.name,
    participants: participants.length > 0 ? participants : [target.name],
    sharedContext: `Shared prompt context: ${prompt}`,
    handoffNotes: [
      "Coordinator decomposes the task into analysis, execution, and review streams.",
      "Participating agents share the prompt, routing decision, and intermediate evidence.",
      "Final output is aggregated into one requester-facing result."
    ]
  };
}


import type { CollaborationContext, ExecutionTarget } from "@ai-agent-platform/shared";

interface BuildCollaborationContextInput {
  prompt: string;
  target: ExecutionTarget;
  agents: ExecutionTarget[];
}

export function buildCollaborationContext({
  prompt,
  target,
  agents
}: BuildCollaborationContextInput): CollaborationContext | null {
  const participants = agents
    .filter((agent) => agent.status === "online")
    .slice(0, 3)
    .map((agent) => agent.name);

  if (target.type !== "agent" || (!target.capabilities.includes("multi-agent") && participants.length < 2)) {
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

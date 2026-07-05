import type { CollaborationContext, ExecutionTarget, TaskRoutingMode } from "@ai-agent-platform/shared";

interface AggregateResultInput {
  prompt: string;
  routingMode: TaskRoutingMode;
  target: ExecutionTarget;
  collaborationContext: CollaborationContext | null;
}

export function aggregateResult({
  prompt,
  routingMode,
  target,
  collaborationContext
}: AggregateResultInput) {
  const executionSummary =
    target.type === "workflow"
      ? `${target.name} completed intake, validation, assignment, execution, and review.`
      : `${target.name} analyzed the request, identified accountable work, and prepared an execution response.`;

  const collaborationSummary = collaborationContext
    ? ` Collaboration used shared context across ${collaborationContext.participants.join(", ")}.`
    : "";

  return {
    summary: `${target.name} handled the task through ${routingMode} routing.`,
    output: `${executionSummary} Prompt: "${prompt}".${collaborationSummary} The final response was normalized and persisted with an audit trail.`
  };
}

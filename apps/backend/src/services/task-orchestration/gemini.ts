import type { CollaborationContext, ExecutionTarget, TaskRoutingMode } from "@ai-agent-platform/shared";
import { env } from "../../config/env.js";

interface GenerateRealResultInput {
  prompt: string;
  routingMode: TaskRoutingMode;
  target: ExecutionTarget;
  collaborationContext: CollaborationContext | null;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  currentStatistics?: string;
  currentEvents?: string;
}

export async function generateRealResult({
  prompt,
  routingMode,
  target,
  collaborationContext,
  history,
  currentStatistics,
  currentEvents
}: GenerateRealResultInput): Promise<{ summary: string; output: string; calendarActions?: any[] }> {
  if (!env.geminiApiKey) {
    throw Object.assign(
      new Error("GEMINI_API_KEY environment variable is not configured. Please set it in your environment or .env file."),
      { code: "GEMINI_API_KEY_REQUIRED", statusCode: 400 }
    );
  }

  let conversationHistoryString = "";
  if (history && history.length > 0) {
    conversationHistoryString = "\nConversation history in this thread so far:\n" +
      history.map((h) => `${h.role === "user" ? "User" : "Assistant"}: ${h.content}`).join("\n") + "\n";
  }

  let statsContext = "";
  if (currentStatistics) {
    statsContext = `- Current Statistics Context (use these exact numbers/values when generating reports or statistics): ${currentStatistics}\n`;
  }
  let eventsContext = "";
  if (currentEvents) {
    eventsContext = `- Current Calendar Events (use these for rescheduling/canceling or finding free slots): ${currentEvents}\n`;
  }

  const systemInstruction = `You are an AI executing a task on an enterprise agent platform.
Given:
- Task prompt: "${prompt}"
- Routing mode: "${routingMode}"
- Execution target name: "${target.name}" (Type: ${target.type})
- Target capabilities: ${JSON.stringify(target.capabilities)}
${
  collaborationContext
    ? `- Collaboration context: Coordinator is "${collaborationContext.coordinator}". Participating agents: ${JSON.stringify(
        collaborationContext.participants
      )}. Handoff notes: ${JSON.stringify(collaborationContext.handoffNotes)}`
    : ""
}
${statsContext}${eventsContext}
${conversationHistoryString}
Execute the task according to the target's persona, role, and capabilities. Keep in mind the conversation history to provide a coherent, contextual follow-up output. Generate a realistic, detailed execution result. Do not use generic placeholders. Use the provided statistics context directly to give accurate numbers when writing statistics reports.

CRITICAL CALENDAR INSTRUCTIONS:
If the user's prompt (or the latest message) instructs to add, delete, cancel, or reschedule/edit a meeting, task, or deadline, you MUST populate the "calendarActions" field in the JSON response to modify the calendar.
- For adding an event: "action" is "add", and "event" should contain:
  - "title": Title of the meeting/task/deadline (e.g. "Meeting with Marketing").
  - "dateTime": Date and time formatted exactly as "DD/MM/YYYY - HH:MM" (e.g., "15/07/2026 - 09:00").
  - "type": "meeting" or "task" or "deadline".
- For deleting/canceling an event: "action" is "delete", and "event" should contain:
  - "title": Substring or full title of the event to delete (e.g. "Marketing").
  - "dateTime": (Optional) Date/Time of the event if specified.
- For rescheduling/editing an event: "action" is "reschedule", and "event" should contain:
  - "title": Title or substring of the event to edit (e.g. "Marketing").
  - "dateTime": The new Date and time formatted as "DD/MM/YYYY - HH:MM" (e.g., "16/07/2026 - 14:00").

Provide your response strictly in the following JSON format:
{
  "summary": "A concise one or two sentence summary of what the target did to execute the task.",
  "output": "The detailed output or response produced by the execution target (e.g. analysis, response, code snippet, report, or workflow actions taken).",
  "calendarActions": [
    {
      "action": "add" | "delete" | "reschedule",
      "event": {
        "title": "...",
        "dateTime": "...",
        "type": "meeting" | "task" | "deadline"
      }
    }
  ]
}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent?key=${env.geminiApiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: systemInstruction
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API request failed: Status ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as any;
  const contentText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!contentText) {
    throw new Error("Invalid response structure from Gemini API");
  }

  try {
    const parsed = JSON.parse(contentText);
    return {
      summary: parsed.summary || `${target.name} handled the task.`,
      output: parsed.output || contentText,
      calendarActions: parsed.calendarActions || []
    };
  } catch (error) {
    return {
      summary: `${target.name} completed the task.`,
      output: contentText,
      calendarActions: []
    };
  }
}

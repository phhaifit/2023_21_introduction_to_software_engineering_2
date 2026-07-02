import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("workflows", (table) => {
    table.uuid("id").primary();
    table.text("workspace_id").notNullable().index();
    table.text("name").notNullable();
    table.text("description").notNullable().defaultTo("");
    table.enu("status", ["draft", "active", "archived"], {
      enumName: "workflow_status",
      useNative: false
    }).notNullable().defaultTo("draft");
    table.jsonb("steps").notNullable().defaultTo("[]");
    table.timestamp("last_run_at", { useTz: true }).nullable();
    table.integer("execution_count").notNullable().defaultTo(0);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.unique(["workspace_id", "name"]);
  });

  await knex("workflows").insert([
    {
      id: "f4dd31ab-a4b0-4ee6-a1d7-3b2a6bf7d101",
      workspace_id: "default-workspace",
      name: "Customer onboarding workflow",
      description: "Coordinate research, writing, review, and publishing agents for a customer onboarding package.",
      status: "active",
      steps: JSON.stringify([
        { id: "step-1", name: "Collect customer context", agentId: "agent-research", agentName: "Research Agent", order: 1, timeoutSeconds: 60, onFailure: "stop" },
        { id: "step-2", name: "Draft onboarding material", agentId: "agent-writing", agentName: "Writing Agent", order: 2, timeoutSeconds: 90, onFailure: "stop" },
        { id: "step-3", name: "Review compliance notes", agentId: "agent-review", agentName: "Review Agent", order: 3, timeoutSeconds: 60, onFailure: "continue" }
      ]),
      execution_count: 0
    },
    {
      id: "3c7a0996-e6dd-404f-9177-d05e5015a702",
      workspace_id: "default-workspace",
      name: "Weekly content publishing workflow",
      description: "Prepare and publish a weekly content package with multiple agents.",
      status: "draft",
      steps: JSON.stringify([
        { id: "step-1", name: "Research topic", agentId: "agent-research", agentName: "Research Agent", order: 1, timeoutSeconds: 45, onFailure: "stop" },
        { id: "step-2", name: "Prepare final draft", agentId: "agent-writing", agentName: "Writing Agent", order: 2, timeoutSeconds: 90, onFailure: "stop" }
      ]),
      execution_count: 0
    }
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("workflows");
}

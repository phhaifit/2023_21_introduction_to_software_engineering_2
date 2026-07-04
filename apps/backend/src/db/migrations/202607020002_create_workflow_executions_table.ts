import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("workflow_executions", (table) => {
    table.uuid("id").primary();
    table.uuid("workflow_id").notNullable().references("id").inTable("workflows").onDelete("CASCADE");
    table.text("workflow_name").notNullable();
    table.enu("status", ["pending", "running", "success", "failed"], {
      enumName: "workflow_execution_status",
      useNative: false
    }).notNullable().defaultTo("pending");
    table.text("trigger_source").notNullable().defaultTo("manual");
    table.timestamp("started_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("finished_at", { useTz: true }).nullable();
    table.integer("duration_ms").nullable();
    table.jsonb("logs").notNullable().defaultTo("[]");

    table.index(["workflow_id", "started_at"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("workflow_executions");
}

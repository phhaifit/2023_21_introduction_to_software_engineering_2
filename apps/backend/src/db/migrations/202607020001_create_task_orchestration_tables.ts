import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("task_workflows", (table) => {
    table.uuid("id").primary();
    table.text("workspace_id").notNullable().index();
    table.text("name").notNullable();
    table.text("status").notNullable().defaultTo("online");
    table.specificType("capabilities", "text[]").notNullable().defaultTo("{}");
    table.text("description").nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.unique(["workspace_id", "name"]);
  });

  await knex.schema.createTable("orchestrated_tasks", (table) => {
    table.uuid("id").primary();
    table.text("workspace_id").notNullable().index();
    table.text("requester_id").notNullable();
    table.text("prompt").notNullable();
    table.text("routing_mode").notNullable();
    table.text("target_type").notNullable();
    table.text("target_id").notNullable();
    table.text("target_name").notNullable();
    table.text("status").notNullable().defaultTo("queued");
    table.text("result").nullable();
    table.text("result_summary").nullable();
    table.text("error").nullable();
    table.jsonb("collaboration_context").nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("task_audit_logs", (table) => {
    table.uuid("id").primary();
    table.uuid("task_id").notNullable().references("id").inTable("orchestrated_tasks").onDelete("CASCADE");
    table.text("title").notNullable();
    table.text("detail").notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("task_audit_logs");
  await knex.schema.dropTableIfExists("orchestrated_tasks");
  await knex.schema.dropTableIfExists("task_workflows");
}

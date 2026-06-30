import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("agents", (table) => {
    table.uuid("id").primary();
    table.text("workspace_id").notNullable().index();
    table.text("name").notNullable();
    table.text("role").notNullable();
    table.text("model").notNullable();
    table.text("instruction_content").notNullable();
    table.enu("status", ["active", "inactive"], {
      useNative: false,
      enumName: "agent_status"
    }).notNullable().defaultTo("active");
    table.text("directory_path").nullable();
    table.text("skill_file_path").nullable();
    table.text("created_by_user_id").nullable();
    table.text("updated_by_user_id").nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.unique(["workspace_id", "name"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("agents");
}
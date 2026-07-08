import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("orchestrated_tasks", (table) => {
    table.jsonb("messages").nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("orchestrated_tasks", (table) => {
    table.dropColumn("messages");
  });
}

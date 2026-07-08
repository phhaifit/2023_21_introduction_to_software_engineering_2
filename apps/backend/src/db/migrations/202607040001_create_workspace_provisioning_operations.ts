import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("workspace_provisioning_operations", (table) => {
    table.uuid("id").primary();
    table
      .uuid("transaction_id")
      .notNullable()
      .references("id")
      .inTable("payment_transactions")
      .unique();
    table.uuid("subscription_id").notNullable().references("id").inTable("subscriptions");
    table.text("workspace_id").notNullable().index();
    table.text("plan_id").notNullable().references("id").inTable("plans");
    table.text("action").notNullable();
    table.text("status").notNullable();
    table.text("idempotency_key").notNullable().unique();
    table.text("failure_code").nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("workspace_provisioning_operations");
}

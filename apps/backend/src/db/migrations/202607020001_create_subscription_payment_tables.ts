import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("plans", (table) => {
    table.text("id").primary();
    table.text("name").notNullable().unique();
    table.integer("monthly_price").notNullable();
    table.integer("cpu").notNullable();
    table.integer("ram_gb").notNullable();
    table.integer("storage_gb").notNullable();
    table.integer("max_agents").notNullable();
    table.text("support_level").notNullable();
    table.boolean("active").notNullable().defaultTo(true);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("subscriptions", (table) => {
    table.uuid("id").primary();
    table.text("user_id").notNullable().index();
    table.text("workspace_id").notNullable().index();
    table.text("plan_id").notNullable().references("id").inTable("plans");
    table.text("status").notNullable();
    table.timestamp("start_date", { useTz: true }).notNullable();
    table.timestamp("end_date", { useTz: true }).notNullable();
    table.text("workspace_status").notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(
    "CREATE UNIQUE INDEX subscriptions_one_active_per_user ON subscriptions (user_id) WHERE status = 'ACTIVE'"
  );

  await knex.schema.createTable("payment_transactions", (table) => {
    table.uuid("id").primary();
    table.text("user_id").notNullable().index();
    table.text("workspace_id").notNullable().index();
    table.uuid("subscription_id").nullable().references("id").inTable("subscriptions");
    table.text("plan_id").notNullable().references("id").inTable("plans");
    table.text("type").notNullable();
    table.integer("amount").notNullable();
    table.text("status").notNullable();
    table.text("gateway_transaction_id").notNullable().unique();
    table.text("payment_url").notNullable();
    table.timestamp("fulfillment_completed_at", { useTz: true }).nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex("plans").insert([
    {
      id: "standard",
      name: "Standard",
      monthly_price: 199000,
      cpu: 2,
      ram_gb: 4,
      storage_gb: 20,
      max_agents: 5,
      support_level: "Standard",
      active: true
    },
    {
      id: "premium",
      name: "Premium",
      monthly_price: 299000,
      cpu: 4,
      ram_gb: 8,
      storage_gb: 40,
      max_agents: 20,
      support_level: "Priority",
      active: true
    }
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("payment_transactions");
  await knex.schema.dropTableIfExists("subscriptions");
  await knex.schema.dropTableIfExists("plans");
}

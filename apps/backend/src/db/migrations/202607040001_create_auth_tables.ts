import type { Knex } from "knex";

const USER_STATUS_ENUM = "user_status";
const USERS_TABLE = "users";
const AUTH_TOKENS_TABLE = "auth_tokens";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    DO $$
    BEGIN
      CREATE TYPE "${USER_STATUS_ENUM}" AS ENUM ('active', 'disabled', 'locked');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END
    $$;
  `);

  const hasUsersTable = await knex.schema.hasTable(USERS_TABLE);

  if (!hasUsersTable) {
    await knex.schema.createTable(USERS_TABLE, (table) => {
      table.uuid("id").primary();
      table.text("email").notNullable();
      table.text("password_hash").notNullable();
      table.specificType("status", `"${USER_STATUS_ENUM}"`).notNullable().defaultTo("active");
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

      table.unique(["email"], "users_email_key");
    });
  }

  const hasAuthTokensTable = await knex.schema.hasTable(AUTH_TOKENS_TABLE);

  if (!hasAuthTokensTable) {
    await knex.schema.createTable(AUTH_TOKENS_TABLE, (table) => {
      table.uuid("id").primary();
      table.uuid("user_id").notNullable();
      table.text("token_hash").notNullable();
      table.timestamp("issued_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp("expires_at", { useTz: true }).notNullable();
      table.boolean("revoked").notNullable().defaultTo(false);
      table.timestamp("revoked_at", { useTz: true }).nullable();

      table.unique(["token_hash"], "auth_tokens_token_hash_key");
      table.index(["user_id"], "auth_tokens_user_id_idx");
      table.index(["expires_at"], "auth_tokens_expires_at_idx");
      table.index(["revoked", "expires_at"], "auth_tokens_revoked_expires_at_idx");

      table
        .foreign("user_id", "auth_tokens_user_id_fkey")
        .references("id")
        .inTable(USERS_TABLE)
        .onDelete("CASCADE")
        .onUpdate("CASCADE");
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(AUTH_TOKENS_TABLE);
  await knex.schema.dropTableIfExists(USERS_TABLE);
  await knex.raw(`DROP TYPE IF EXISTS "${USER_STATUS_ENUM}";`);
}

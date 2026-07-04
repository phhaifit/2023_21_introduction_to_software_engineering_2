import type { Knex } from "knex";

const AGENTS_TABLE = "agents";
const SKILL_FILE_CONTENT_COLUMN = "skill_file_content";

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable(AGENTS_TABLE);

  if (!hasTable) {
    return;
  }

  const hasColumn = await knex.schema.hasColumn(AGENTS_TABLE, SKILL_FILE_CONTENT_COLUMN);

  if (!hasColumn) {
    await knex.schema.alterTable(AGENTS_TABLE, (table) => {
      table.text(SKILL_FILE_CONTENT_COLUMN).notNullable().defaultTo("");
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable(AGENTS_TABLE);

  if (!hasTable) {
    return;
  }

  const hasColumn = await knex.schema.hasColumn(AGENTS_TABLE, SKILL_FILE_CONTENT_COLUMN);

  if (hasColumn) {
    await knex.schema.alterTable(AGENTS_TABLE, (table) => {
      table.dropColumn(SKILL_FILE_CONTENT_COLUMN);
    });
  }
}

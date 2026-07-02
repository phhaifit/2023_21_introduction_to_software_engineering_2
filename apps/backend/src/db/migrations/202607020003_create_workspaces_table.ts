import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("workspaces", (table) => {
    table.uuid("id").primary();
    table.text("name").notNullable();
    table.text("description").notNullable().defaultTo("");
    table.text("owner_name").notNullable().defaultTo("Workspace Team");
    table.enu("status", ["PENDING", "PROVISIONING", "RUNNING", "FAILED", "STOPPED"], {
      enumName: "workspace_status",
      useNative: false
    }).notNullable().defaultTo("PROVISIONING");
    table.text("template_id").notNullable();
    table.enu("resource_profile", ["Starter", "Standard", "Performance"], {
      enumName: "workspace_resource_profile",
      useNative: false
    }).notNullable().defaultTo("Standard");
    table.text("region").notNullable().defaultTo("ap-southeast-1");
    table.text("access_url").nullable();
    table.text("container_id").nullable();
    table.text("openclaw_instance_id").nullable();
    table.text("failure_reason").nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.unique(["name"]);
    table.index(["status"]);
  });

  await knex("workspaces").insert([
    {
      id: "5d62d587-5a68-4f65-8062-88a21f518001",
      name: "Sales Operation Workspace",
      description: "Workspace ho tro van hanh phong Sales.",
      owner_name: "Workspace Team",
      status: "RUNNING",
      template_id: "business-operations",
      resource_profile: "Standard",
      region: "ap-southeast-1",
      access_url: "https://sales-ops.workspace.local",
      container_id: "ctr-sales-ops-001",
      openclaw_instance_id: "oc-sales-ops-001"
    },
    {
      id: "5d62d587-5a68-4f65-8062-88a21f518002",
      name: "HR Automation Workspace",
      description: "Workspace dung de theo doi quy trinh nhan su.",
      owner_name: "Workspace Team",
      status: "PROVISIONING",
      template_id: "hr-automation",
      resource_profile: "Starter",
      region: "ap-southeast-1",
      container_id: "ctr-hr-auto-001"
    },
    {
      id: "5d62d587-5a68-4f65-8062-88a21f518003",
      name: "Finance Review Workspace",
      description: "Workspace minh hoa trang thai provisioning that bai.",
      owner_name: "Workspace Team",
      status: "FAILED",
      template_id: "finance-review",
      resource_profile: "Performance",
      region: "ap-southeast-1",
      failure_reason: "Khong the khoi tao OpenClaw instance trong thoi gian cho phep."
    },
    {
      id: "5d62d587-5a68-4f65-8062-88a21f518004",
      name: "Support Sandbox Workspace",
      description: "Workspace da dung de test start/restart.",
      owner_name: "Workspace Team",
      status: "STOPPED",
      template_id: "business-operations",
      resource_profile: "Starter",
      region: "ap-southeast-1",
      container_id: "ctr-support-001",
      openclaw_instance_id: "oc-support-001"
    }
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("workspaces");
}

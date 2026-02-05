// lib\rbac.ts
export type Role =
    | "admin"
    | "finance"
    | "clerk"
    | "documentation"
    | "sales"
    | "partner"
    | "seniorExecutive"
    | "juniorExecutive"
    | "executive"
    | "supervisor"
    | "others";

export type Permission =
    | "*"
    | "dashboard"
    | "loadings.view"
    | "loadings.client.view"
    | "loadings.client.edit"
    | "loadings.former.view"
    | "loadings.agent.view"
    | "stock.view"
    | "partyBills.view"
    | "vehicles.view"
    | "vehicles.create"
    | "employees.view"
    | "teams.view"
    | "audit.view"
    | "payments.view"
    | "receipts.view";


type RolePermissionMap = Record<Role, Permission[]>;

export const ROLE_PERMISSIONS: RolePermissionMap = {
    admin: ["*"] as Permission[],

    documentation: [
        "loadings.view",
        "loadings.client.view",
        "loadings.client.edit",
        "stock.view",
        "partyBills.view",
    ],

    sales: [
        "loadings.view",
        "loadings.client.view",
        "loadings.client.edit",
        "stock.view",
        "partyBills.view",
    ],

    partner: ["stock.view", "partyBills.view"],

    finance: ["payments.view", "receipts.view", "partyBills.view"],

    clerk: ["loadings.view"],

    seniorExecutive: ["loadings.view"],
    juniorExecutive: ["loadings.view"],
    executive: ["loadings.view"],
    supervisor: ["loadings.view"],
    others: ["loadings.view"],
};


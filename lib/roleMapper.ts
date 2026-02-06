import { Role } from "@prisma/client";

export function mapDesignationToRole(designation?: string): Role {
    if (!designation) return Role.others;

    const d = designation.toLowerCase().trim();

    if (d.includes("admin")) return Role.admin;
    if (d.includes("finance") || d.includes("account")) return Role.finance;

    if (d.includes("clerk")) return Role.clerk;

    if (d.includes("sales") || d.includes("marketing")) return Role.sales;

    if (d.includes("supervisor")) return Role.supervisor;

    if (d.includes("documentation")) return Role.documentation;

    if (d.includes("partner")) return Role.partner;

    if (d.includes("senior")) return Role.seniorExecutive;
    if (d.includes("junior")) return Role.juniorExecutive;

    if (d.includes("executive")) return Role.executive;

    return Role.others;
}

import prisma from "@/lib/prisma";

export async function hasServerPermission(
    role: string,
    permission: string,
    userId?: string
) {
    // ✅ ADMIN FULL ACCESS
    if (role === "admin") return true;

    // ❌ NO DEFAULT ACCESS FOR OTHERS
    // everything must come from DB

    const rolePerm = await prisma.rolePermission.findFirst({
        where: { role, permission },
    });

    if (rolePerm) return true;

    // optional user override
    if (userId) {
        const override = await prisma.userPermissionOverride.findFirst({
            where: { userId, permission },
        });

        if (override) return override.allow;
    }

    return false;
}

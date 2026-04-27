//app\api\vendor-bills\verify-delete-otp\route.ts
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const { itemId, otp } = await req.json();

        if (!itemId || !otp) {
            return Response.json(
                { message: "Item ID and OTP required" },
                { status: 400 },
            );
        }

        const stored = globalThis.deleteOtpStore?.[itemId];

        if (!stored) {
            return Response.json(
                { message: "OTP not found" },
                { status: 400 },
            );
        }

        // OTP expired
        if (stored.expiresAt < Date.now()) {
            delete globalThis.deleteOtpStore?.[itemId];

            return Response.json(
                { message: "OTP expired" },
                { status: 400 },
            );
        }

        // OTP invalid
        if (stored.otp !== otp) {
            return Response.json(
                { message: "Invalid OTP" },
                { status: 400 },
            );
        }

        // SOURCE = FORMER (Farmer)
        if (stored.source === "FORMER") {
            const item = await prisma.formerItem.findUnique({
                where: { id: itemId },
                select: {
                    id: true,
                    formerLoadingId: true,
                },
            });

            if (!item) {
                delete globalThis.deleteOtpStore?.[itemId];

                return Response.json(
                    { message: "Farmer item not found" },
                    { status: 404 },
                );
            }

            await prisma.formerItem.delete({
                where: { id: itemId },
            });

            const remaining = await prisma.formerItem.count({
                where: {
                    formerLoadingId: item.formerLoadingId,
                },
            });

            if (remaining === 0) {
                await prisma.formerLoading.delete({
                    where: {
                        id: item.formerLoadingId,
                    },
                });
            }

            delete globalThis.deleteOtpStore?.[itemId];

            return Response.json({
                success: true,
                deletedBill: remaining === 0,
                message:
                    remaining === 0
                        ? "Last farmer item deleted • Bill removed"
                        : "Farmer item deleted successfully",
            });
        }

        // SOURCE = AGENT
        if (stored.source === "AGENT") {
            const item = await prisma.agentItem.findUnique({
                where: { id: itemId },
                select: {
                    id: true,
                    agentLoadingId: true,
                },
            });

            if (!item) {
                delete globalThis.deleteOtpStore?.[itemId];

                return Response.json(
                    { message: "Agent item not found" },
                    { status: 404 },
                );
            }

            await prisma.agentItem.delete({
                where: { id: itemId },
            });

            const remaining = await prisma.agentItem.count({
                where: {
                    agentLoadingId: item.agentLoadingId,
                },
            });

            if (remaining === 0) {
                await prisma.agentLoading.delete({
                    where: {
                        id: item.agentLoadingId,
                    },
                });
            }

            delete globalThis.deleteOtpStore?.[itemId];

            return Response.json({
                success: true,
                deletedBill: remaining === 0,
                message:
                    remaining === 0
                        ? "Last agent item deleted • Bill removed"
                        : "Agent item deleted successfully",
            });
        }

        return Response.json(
            { message: "Invalid source type" },
            { status: 400 },
        );
    } catch (error: any) {
        console.error("VERIFY OTP ERROR:", error);

        return Response.json(
            {
                message:
                    error?.message ||
                    "Verification failed",
            },
            { status: 500 },
        );
    }
}
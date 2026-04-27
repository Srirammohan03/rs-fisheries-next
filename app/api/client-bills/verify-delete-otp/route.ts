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

        if (stored.expiresAt < Date.now()) {
            delete globalThis.deleteOtpStore?.[itemId];

            return Response.json(
                { message: "OTP expired" },
                { status: 400 },
            );
        }

        if (stored.otp !== otp) {
            return Response.json(
                { message: "Invalid OTP" },
                { status: 400 },
            );
        }

        // Delete selected item
        await prisma.clientItem.delete({
            where: { id: itemId },
        });

        // Correct Prisma relation field = loading
        const remaining = await prisma.clientItem.count({
            where: {
                loading: {
                    id: stored.billId,
                },
            },
        });

        // Delete full bill if last item
        if (remaining === 0) {
            await prisma.clientLoading.delete({
                where: { id: stored.billId },
            });
        }

        delete globalThis.deleteOtpStore?.[itemId];

        return Response.json({
            success: true,
            message: "Verified and deleted successfully",
        });
    } catch (error: any) {
        console.error("VERIFY OTP ERROR:", error);

        return Response.json(
            {
                message: error?.message || "Verification failed",
            },
            { status: 500 },
        );
    }
}
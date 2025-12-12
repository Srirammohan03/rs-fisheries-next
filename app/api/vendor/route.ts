// app/api/payments/vendor/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const {
            vendorId,
            vendorName,
            source,
            date,
            amount,
            paymentMode,
            accountNumber,
            ifsc,
            bankName,
            bankAddress,
            note,
            isInstallment = false,
            installments,
            installmentNumber,
        } = body;

        if (!vendorId || !amount || !date) {
            return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
        }

        const payment = await prisma.vendorPayment.create({
            data: {
                vendorId,
                vendorName: vendorName || "Unknown",
                source,
                date: new Date(date),
                amount: Number(amount),
                paymentMode,
                accountNumber: accountNumber || null,
                ifsc: ifsc || null,
                bankName: bankName || null,
                bankAddress: bankAddress || null,
                // note: note || null,
                paymentdetails: note || null,
                isInstallment,
                installments: installments ? Number(installments) : null,
                installmentNumber: installmentNumber ? Number(installmentNumber) : null,
            },
        });

        return NextResponse.json({ message: "Payment saved!", data: payment }, { status: 201 });
    } catch (error: any) {
        console.error("Payment save error:", error);
        return NextResponse.json(
            { message: error.message || "Server error" },
            { status: 500 }
        );
    }
}
export async function GET() {
    const payments = await prisma.vendorPayment.findMany({
        orderBy: { date: "desc" },
    });
    return NextResponse.json({ data: payments });
}
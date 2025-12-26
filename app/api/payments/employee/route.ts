// app/api/payments/employee/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PaymentMode } from "@prisma/client";


export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();

        const userId = formData.get("userId") as string;
        const employeeName = formData.get("employeeName") as string;
        const dateStr = formData.get("date") as string;
        const amountStr = formData.get("amount") as string;
        const paymentModeStr = formData.get("paymentMode") as string;
        const reference = (formData.get("reference") as string) || null;

        // Validation
        if (!userId || !employeeName || !dateStr || !amountStr || !paymentModeStr) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) {
            return NextResponse.json(
                { error: "Invalid amount" },
                { status: 400 }
            );
        }

        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            return NextResponse.json(
                { error: "Invalid date" },
                { status: 400 }
            );
        }

        const paymentMode = paymentModeStr.toUpperCase() as PaymentMode;
        if (!["CASH", "AC", "UPI", "CHEQUE"].includes(paymentMode)) {
            return NextResponse.json(
                { error: "Invalid payment mode" },
                { status: 400 }
            );
        }

        // Save to database
        const payment = await prisma.employeePayment.create({
            data: {
                userId,
                employeeName,
                date,
                amount,
                paymentMode,
                reference: reference || undefined,
            },
            include: {
                user: {
                    select: {
                        id: true,
                    },
                },
            },
        });

        return NextResponse.json(
            {
                success: true,
                message: "Salary payment recorded successfully",
                payment,
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("Employee payment save error:", error);
        return NextResponse.json(
            { error: "Failed to save payment", details: error.message },
            { status: 500 }
        );
    }
}

// Optional: GET all employee payments (for history page later)
export async function GET() {
    try {
        const payments = await prisma.employeePayment.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                    },
                },
            },
            orderBy: { date: "desc" },
        });

        return NextResponse.json({ success: true, payments });
    } catch (error: any) {
        console.error("Employee payments fetch error:", error);
        return NextResponse.json(
            { error: "Failed to fetch payments" },
            { status: 500 }
        );
    }
}
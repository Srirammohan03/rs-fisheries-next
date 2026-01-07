import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PaymentMode } from "@prisma/client";
import { ApiError } from "@/utils/ApiError";
import { apiHandler } from "@/utils/apiHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { withAuth } from "@/lib/withAuth";
import { logAudit } from "@/lib/auditLogger";

export const POST = withAuth(
  apiHandler(async (req: NextRequest) => {
    const formData = await req.formData();

    const employeeId = formData.get("employeeId")?.toString().trim();
    const employeeName = formData.get("employeeName")?.toString().trim();
    const salaryMonth = formData.get("salaryMonth")?.toString().trim();
    const dateStr = formData.get("date")?.toString();
    const amountStr = formData.get("amount")?.toString();
    const paymentModeStr = formData.get("paymentMode")?.toString();
    const reference = formData.get("reference")?.toString().trim() || null;

    if (
      !employeeId ||
      !employeeName ||
      !salaryMonth ||
      !dateStr ||
      !amountStr ||
      !paymentModeStr
    ) {
      throw new ApiError(400, "Missing required fields");
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      throw new ApiError(400, "Invalid amount");
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new ApiError(400, "Invalid payment date");
    }

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(salaryMonth)) {
      throw new ApiError(400, "Invalid salary month format. Expected YYYY-MM");
    }

    const upperMode = paymentModeStr.toUpperCase();
    if (!["CASH", "AC", "UPI", "CHEQUE"].includes(upperMode)) {
      throw new ApiError(400, "Invalid payment mode");
    }

    const paymentMode = upperMode as PaymentMode;

    if (paymentMode !== PaymentMode.CASH && !reference) {
      throw new ApiError(400, "Reference is required for non-cash payments");
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new ApiError(404, "Employee not found");
    }

    try {
      const payment = await prisma.$transaction(async (tx) => {
        const createPayment = await prisma.employeePayment.create({
          data: {
            employeeId,
            employeeName,
            salaryMonth,
            date,
            amount,
            paymentMode,
            reference: reference ?? undefined,
          },
        });

        await logAudit({
          module: "Employee Payments",
          action: "CREATE",
          recordId: createPayment.id,
          request: req,
          user: (req as any).user,
          oldValues: null,
          newValues: {
            employeeName: createPayment.employeeName,
            salaryMonth: createPayment.salaryMonth,
            date: createPayment.date,
            amount: createPayment.amount,
            paymentMode: createPayment.paymentMode,
          },
          label: `Employee Payments created for employee ID: ${employeeId}`,
        });

        return createPayment;
      });
      return NextResponse.json(
        new ApiResponse(
          201,
          { payment },
          "Salary payment recorded successfully"
        )
      );
    } catch (error: any) {
      if (error.code === "P2002") {
        throw new ApiError(
          400,
          `Salary for ${salaryMonth} has already been paid to this employee`
        );
      }
      throw error;
    }
  })
);

export const GET = apiHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");

  const payments = await prisma.employeePayment.findMany({
    where: employeeId ? { employeeId } : {},
    orderBy: { date: "desc" },
    include: {
      employee: {
        select: {
          fullName: true,
          designation: true,
        },
      },
    },
  });

  return NextResponse.json(
    new ApiResponse(200, { payments }, "Employee payments fetched successfully")
  );
});

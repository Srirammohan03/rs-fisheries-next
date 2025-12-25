// app/api/vendor/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json(
        { error: "This endpoint is deprecated. Use /api/payments/vendor instead." },
        { status: 410 }
    );
}

export async function POST() {
    return NextResponse.json(
        { error: "This endpoint is deprecated. Use /api/payments/vendor instead." },
        { status: 410 }
    );
}
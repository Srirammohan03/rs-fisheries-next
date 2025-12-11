import { NextResponse } from "next/server";

export const apiHandler = (handler: Function) => {
  return async (req: Request, context?: any) => {
    try {
      return await handler(req, context);
    } catch (error: any) {
      console.error("API Error:", error);

      const status = error.statusCode || 500;

      return NextResponse.json(
        {
          success: false,
          message: error.message || "Server Error",
          errors: error.errors || [],
          data: error.data || null,
        },
        { status }
      );
    }
  };
};

import nodemailer from "nodemailer";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_EMAIL_PASS = process.env.ADMIN_EMAIL_PASS;

if (!ADMIN_EMAIL || !ADMIN_EMAIL_PASS) {
    throw new Error(
        "ADMIN_EMAIL or ADMIN_EMAIL_PASS missing in environment variables",
    );
}

export async function POST(req: Request) {
    try {
        const { billId, itemId, source } = await req.json();

        if (!billId || !itemId || !source) {
            return Response.json(
                {
                    message: "Bill ID, Item ID and Source required",
                },
                { status: 400 },
            );
        }

        if (!["FORMER", "AGENT", "CLIENT"].includes(source)) {
            return Response.json(
                {
                    message: "Invalid source type",
                },
                { status: 400 },
            );
        }

        const otp = Math.floor(
            100000 + Math.random() * 900000,
        ).toString();

        if (!globalThis.deleteOtpStore) {
            globalThis.deleteOtpStore = {};
        }

        globalThis.deleteOtpStore[itemId] = {
            otp,
            billId,
            source,
            expiresAt: Date.now() + 5 * 60 * 1000,
        };

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: ADMIN_EMAIL,
                pass: ADMIN_EMAIL_PASS,
            },
        });

        await transporter.sendMail({
            from: ADMIN_EMAIL,
            to: ADMIN_EMAIL,
            subject: `RS Fisheries ${source} Bill Delete OTP`,
            html: `
        <div style="font-family:Arial,sans-serif;padding:20px">
          <h2>Bill Delete Verification</h2>
          <p>Source: <b>${source}</b></p>
          <p>Your OTP is:</p>
          <h1 style="letter-spacing:4px;">${otp}</h1>
          <p>This OTP is valid for 5 minutes.</p>
          <p>If you did not request this, ignore this email.</p>
        </div>
      `,
        });

        return Response.json({
            success: true,
            message: "OTP sent successfully",
        });
    } catch (error: any) {
        console.error("SEND OTP ERROR:", error);

        return Response.json(
            {
                message:
                    error?.message || "Failed to send OTP",
            },
            { status: 500 },
        );
    }
}
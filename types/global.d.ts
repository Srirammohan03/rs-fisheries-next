export { };

declare global {
    var deleteOtpStore:
        | Record<
            string,
            {
                otp: string;
                billId: string;
                expiresAt: number;
                source: "FORMER" | "AGENT" | "CLIENT";
            }
        >
        | undefined;
}
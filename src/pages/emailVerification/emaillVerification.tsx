import { Container, Title, Text, Stack, Button } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { IconCircleCheck, IconCircleX } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { resendEmailVerification, verifyEmail } from "../../api/emailVerification";

export default function EmailVerification() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") || "";
    const email = searchParams.get("email") || "";
    const navigate = useNavigate();

    const [seconds, setSeconds] = useState(10);
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

    useEffect(() => {
        const verify = async () => {
            try {
                const response = await verifyEmail(token);
                setStatus("success");
            } catch (err: any) {
                setStatus("error");
                console.error(err);
                showNotification({
                    title: "Verification Failed",
                    message: err?.message || "Invalid or expired token",
                    color: "red",
                });
            }
        };
        verify();
    }, [token]);

    // Countdown only on success
    useEffect(() => {
        if (status !== "success") return;

        const interval = setInterval(() => setSeconds((prev) => prev - 1), 1000);
        const timeout = setTimeout(() => navigate("/sign-in"), 5000);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [status, navigate]);

    const handleResend = async () => {
        try {
            await resendEmailVerification(email);
            showNotification({
                title: "Email Sent",
                message: "A new verification email has been sent.",
                color: "green",
            });
        } catch (err: any) {
            showNotification({
                title: "Failed",
                message: err?.message || "Error sending verification email",
                color: "red",
            });
        }
    };

    return (
        <Container size="xs" mt={80}>
            <div className="bg-white rounded-xl shadow-md p-10 border border-gray-100">
                <Stack align="center">
                    <Title order={2} className="text-blue-600 text-center tracking-wide">
                        Serenity Spa
                    </Title>

                    {status === "success" && (
                        <>
                            <IconCircleCheck size={70} stroke={1.5} className="text-green-500" />

                            <Title order={3} className="text-center font-semibold">
                                Email Verified Successfully
                            </Title>

                            <Text size="sm" ta="center" className="text-gray-600" maw={320}>
                                Your email has been successfully verified.
                                You may now proceed to sign in and enjoy our services.
                            </Text>

                            <Text size="xs" ta="center" className="text-gray-500 mt-2">
                                Redirecting to sign-in in{" "}
                                <span className="font-semibold">{seconds}</span> seconds...
                            </Text>
                        </>
                    )}

                    {status === "error" && (
                        <>
                            <IconCircleX size={70} stroke={1.5} className="text-red-500" />

                            <Title order={3} className="text-center font-semibold text-red-600">
                                Verification Failed
                            </Title>

                            <Text size="sm" ta="center" className="text-gray-600" maw={330}>
                                The verification link is invalid or has expired.
                                Click below to request a new verification email.
                            </Text>

                            <Button
                                fullWidth
                                mt="sm"
                                onClick={handleResend}
                                className="bg-blue-600 hover:bg-blue-700"
                                disabled={!email}
                            >
                                Resend Verification Email
                            </Button>

                            {!email && (
                                <Text size="xs" className="text-gray-400 text-center mt-2">
                                    Cannot resend email: no email address found in URL.
                                </Text>
                            )}
                        </>
                    )}
                </Stack>
            </div>
        </Container>
    );
}

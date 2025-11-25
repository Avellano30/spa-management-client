import { useState } from "react";
import { TextInput, Button, Container, Title } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { requestPasswordReset } from "../../api/passwordReset/passwordReset";

export default function RequestReset() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!email) return;

        setLoading(true);
        try {
            await requestPasswordReset(email);
            showNotification({ title: "Success", message: "Check your email for reset link", color: "green" });
        } catch (err: any) {
            showNotification({ title: "Error", message: err?.message || "Failed", color: "red" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container size="xs" mt={60}>
            <div className="bg-white rounded-lg shadow-lg p-8">
                <Title order={2} mb="md" className="text-center text-blue-600">
                    SPA
                </Title>
                <Title order={4} mb="sm" className="text-center">
                    Reset Password
                </Title>
                <p className="text-center text-sm mb-6">Enter your email to receive a reset link</p>

                <TextInput
                    placeholder="Your email"
                    value={email}
                    onChange={(e) => setEmail(e.currentTarget.value)}
                />
                <Button
                    fullWidth
                    mt="md"
                    onClick={handleSubmit}
                    loading={loading}
                    className="bg-blue-600!"
                >
                    Send Reset Link
                </Button>
            </div>
        </Container>
    );
}

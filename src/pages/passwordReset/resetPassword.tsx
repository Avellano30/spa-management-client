import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import {
    PasswordInput,
    Button,
    Container,
    Title,
    Box,
    Stack,
    Group,
    Text,
    ThemeIcon,
    Progress,
    rem,
} from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";
import { showNotification } from "@mantine/notifications";
import { resetPassword, verifyResetToken } from "../../api/passwordReset/passwordReset";
import { getPasswordChecks, getPasswordStrength } from "../../modules/auth/handleSignup";

export default function ResetPasswordPage() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [valid, setValid] = useState(false);
    const [password, setPassword] = useState("");
    const [passwordFocused, setPasswordFocused] = useState(false);

    // Password checks and strength
    const checks = getPasswordChecks(password);
    const { percent: strengthPercent, color: strengthColor } = getPasswordStrength(password);

    useEffect(() => {
        const verify = async () => {
            try {
                await verifyResetToken(token!);
                setValid(true);
            } catch (err: any) {
                showNotification({ title: "Error", message: err?.message || "Invalid token", color: "red" });
                setValid(false);
            }
        };
        verify();
    }, [token]);

    const handleSubmit = async () => {
        if (!checks.isPasswordValid) {
            showNotification({
                title: "Weak password",
                message: "Password must meet all requirements",
                color: "red",
            });
            return;
        }

        setLoading(true);
        try {
            await resetPassword(token!, password);
            showNotification({ title: "Success", message: "Password reset successfully", color: "green" });
            navigate("/sign-in");
        } catch (err: any) {
            showNotification({ title: "Error", message: err.message || "Failed", color: "red" });
        } finally {
            setLoading(false);
        }
    };

    if (!valid)
        return (
            <Container mt={60}>
                <Title order={3} className="text-center">
                    Invalid or expired token
                </Title>
            </Container>
        );

    return (
        <Container size="xs" mt={60}>
            <div className="bg-white rounded-lg shadow-lg p-8">
                <Title order={2} c="#e50914" mb="md" className="text-center">
                    SPA
                </Title>
                <Title order={4} mb="sm" className="text-center">
                    Set New Password
                </Title>
                <p className="text-center text-sm mb-6">Enter your new password below</p>

                <PasswordInput
                    // className="mb-4"
                    placeholder="New password"
                    value={password}
                    onChange={(e) => setPassword(e.currentTarget.value)}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                />

                {/* Password strength meter */}
                {(passwordFocused || password.length > 0) && (
                    <Box mt={8}>
                        <Group align="center" justify="space-between">
                            <Text size="xs">Strength</Text>
                            <Text size="xs" c="dimmed">{strengthPercent}%</Text>
                        </Group>
                        <Progress mt={6} value={strengthPercent} size={8} radius="sm" color={strengthColor} />
                    </Box>
                )}

                {/* Password validation checklist */}
                {(passwordFocused || password.length > 0) && (
                    <Stack mt={15}>
                        {[
                            { label: "At least 8 characters", valid: checks.isLongEnough },
                            { label: "1 uppercase letter", valid: checks.hasUppercase },
                            { label: "1 lowercase letter", valid: checks.hasLowercase },
                            { label: "1 special character", valid: checks.hasSpecialChar },
                        ].map((req, idx) => (
                            <Group key={idx} align="center">
                                <ThemeIcon
                                    size={18}
                                    radius="xl"
                                    variant="light"
                                    style={{
                                        backgroundColor: req.valid ? "rgba(46,204,113,0.06)" : "transparent",
                                        border: req.valid ? "1px solid rgba(46,204,113,0.2)" : undefined,
                                    }}
                                >
                                    {req.valid ? <IconCheck size={rem(14)} stroke={3} style={{ color: "#2ecc71" }} /> :
                                        <IconX size={rem(14)} stroke={3} style={{ color: "#999" }} />}
                                </ThemeIcon>
                                <Text size="xs">{req.label}</Text>
                            </Group>
                        ))}
                    </Stack>
                )}

                <Button
                    fullWidth
                    mt="md"
                    color="#e50914"
                    onClick={handleSubmit}
                    loading={loading}
                >
                    Reset Password
                </Button>
            </div>
        </Container>
    );
}

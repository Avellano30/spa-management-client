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
    Loader,
    rem,
} from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";
import { showNotification } from "@mantine/notifications";
import { resetPassword, verifyResetToken } from "../../api/passwordReset/passwordReset";
import { getHomepageSettings } from "../../api/settings";
import { getPasswordChecks, getPasswordStrength } from "../../modules/auth/handleSignup";

export default function ResetPasswordPage() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    const [submitting, setSubmitting] = useState(false);
    const [valid, setValid] = useState<boolean | null>(null);
    const [password, setPassword] = useState("");
    const [passwordFocused, setPasswordFocused] = useState(false);
    const [spaName, setSpaName] = useState<string>("");

    // Password checks and strength
    const checks = getPasswordChecks(password);
    const { percent: strengthPercent, color: strengthColor } = getPasswordStrength(password);

    // Fetch spa name from homepage settings (same pattern as EmailVerification)
    useEffect(() => {
        getHomepageSettings().then((s) => setSpaName(s?.brand.name || "")).catch(console.error);
    }, []);

    // Verify reset token
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

        setSubmitting(true);
        try {
            await resetPassword(token!, password);
            showNotification({ title: "Success", message: "Password reset successfully", color: "green" });
            navigate("/sign-in");
        } catch (err: any) {
            showNotification({ title: "Error", message: err.message || "Failed", color: "red" });
        } finally {
            setSubmitting(false);
        }
    };

    // Still verifying token
    if (valid === null) {
        return (
            <Container mt={60} style={{ display: "flex", justifyContent: "center" }}>
                <Loader size="md" />
            </Container>
        );
    }

    // Token invalid or expired
    if (!valid) {
        return (
            <Container mt={60}>
                <Title order={3} className="text-center">
                    Invalid or expired token
                </Title>
            </Container>
        );
    }

    return (
        <Container size="xs" mt={60}>
            <div className="bg-white rounded-xl shadow-md p-10 border border-gray-100">
                <Title order={2} mb="md" className="text-blue-600 text-center tracking-wide">
                    {spaName}
                </Title>
                <Title order={4} mb="sm" className="text-center">
                    Set New Password
                </Title>
                <p className="text-center text-sm mb-6">Enter your new password below</p>

                <PasswordInput
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
                                    {req.valid
                                        ? <IconCheck size={rem(14)} stroke={3} style={{ color: "#2ecc71" }} />
                                        : <IconX size={rem(14)} stroke={3} style={{ color: "#999" }} />}
                                </ThemeIcon>
                                <Text size="xs">{req.label}</Text>
                            </Group>
                        ))}
                    </Stack>
                )}

                <Button
                    fullWidth
                    mt="md"
                    onClick={handleSubmit}
                    loading={submitting}
                    className="bg-blue-600!"
                >
                    Reset Password
                </Button>
            </div>
        </Container>
    );
}
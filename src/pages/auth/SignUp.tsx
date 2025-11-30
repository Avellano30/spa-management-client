import { useEffect, useState } from "react";
import {
    Divider,
    rem,
    PasswordInput,
    Group,
    Text,
    ThemeIcon,
    Stack,
    Progress,
    Box,
    Button,
    Input,
} from "@mantine/core";
import { FcGoogle } from "react-icons/fc";
import { useLocation, useNavigate } from "react-router";
import { useGoogleLogin } from "@react-oauth/google";
import { MdArrowRight } from "react-icons/md";
import { useAuth } from "../../utils/AuthContext";
import { IconCheck, IconX } from "@tabler/icons-react";
import {
    digitsOnly,
    formatPHPhone,
    getPasswordChecks,
    getPasswordStrength,
    handleRegister,
    handleContinueClick,
    showGoogleAuthError,
} from "../../modules/auth/handleSignup.tsx";
import "./shake.css";

const domain = import.meta.env.VITE_DOMAIN;

export default function SignUp() {
    const [firstName, setFirstName] = useState<string>("");
    const [lastName, setLastName] = useState<string>("");
    const [phoneNumber, setPhoneNumber] = useState<string>("");
    const [userName, setUserName] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [nextField, setNextField] = useState<boolean>(false);
    const [passwordFocused, setPasswordFocused] = useState<boolean>(false);
    const [shake, setShake] = useState<boolean>(false);
    const [isRegistering, setIsRegistering] = useState(false);

    const { setAuthState } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const redirect = new URLSearchParams(location.search).get("redirect");

    useEffect(() => {
        if (localStorage.getItem("session")) {
            navigate("/my-appointments");
            return;
        }
    }, [navigate]);

    // Derived password checks and strength
    const checks = getPasswordChecks(password);
    const { percent: strengthPercent, color: strengthColor } = getPasswordStrength(password);

    // Phone validity (PH numbers must have 11 digits)
    const isPhoneValid = digitsOnly(phoneNumber).length === 11;

    // Google login
    const login = useGoogleLogin({
        onSuccess: async ({ code }) => {
            try {
                const response = await fetch(`${domain}/client/auth/google`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ code }),
                });

                if (!response.ok) {
                    showGoogleAuthError();
                    return;
                }

                const tokens = await response.json();
                setAuthState({
                    firstName: tokens.firstName,
                    lastName: tokens.lastName,
                    email: tokens.email,
                });

                localStorage.setItem("session", tokens.token);
                navigate(redirect || "/my-appointments");
            } catch (err) {
                console.error("Google auth fetch error", err);
            }
        },
        flow: "auth-code",
    });

    return (
        <>
            <div className="min-h-screen flex items-center justify-center">
                <div className={`max-w-[394px] w-full bg-white rounded-lg ${shake ? "shake" : ""}`}>
                    <div className="px-10 py-8 rounded-lg shadow-lg">
                        {/* Header */}
                        <h2 className="text-[25px] font-bold text-center text-blue-600 mb-8">Serenity Spa</h2>
                        <h2 className="text-[17px] font-bold text-center">Create your account</h2>
                        <p className="text-[13px] mb-8 text-center">Welcome! Please fill in the details to get started</p>

                        {/* Google Login Button */}
                        <Button
                            variant="default"
                            type="button"
                            leftSection={<FcGoogle size={18} />}
                            className="w-full! py-1.5 px-3 border border-black! rounded-md font-semibold text-gray-800! text-[13px] hover:drop-shadow-md"
                            onClick={() => login()}
                            data-testid="google-login-button"
                        >
                            Continue with Google
                        </Button>

                        <Divider my="xs" label={<span className="text-black">or</span>} labelPosition="center" className="font-bold text-black" color="black" />

                        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                            {nextField ? (
                                <Stack gap="md">
                                    {/* Step 2: Username, Email, Password */}
                                    <Input
                                        variant="unstyled"
                                        type="text"
                                        placeholder="Username"
                                        className={`w-full px-3 border text-[13px] rounded-md ${errorMessage ? "border-blue-600" : "border-black"}`}
                                        value={userName}
                                        onChange={(e) => setUserName(e.target.value)}
                                    />
                                    <Input
                                        variant="unstyled"
                                        type="email"
                                        placeholder="Email"
                                        className={`w-full px-3 border text-[13px] rounded-md ${errorMessage ? "border-blue-600" : "border-black"}`}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />

                                    <PasswordInput
                                        variant="unstyled"
                                        placeholder="Password"
                                        className={`w-full px-3 border text-[13px] rounded-md ${errorMessage ? "border-blue-700" : "border-black"}`}
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.currentTarget.value);
                                            if (errorMessage) setErrorMessage(null);
                                        }}
                                        onFocus={() => setPasswordFocused(true)}
                                        onBlur={() => setPasswordFocused(false)}
                                        style={{
                                            borderColor: checks.isPasswordValid ? "#2ecc71" : errorMessage ? "#e50914" : undefined,
                                        }}
                                    />

                                    {/* Password Strength */}
                                    {(passwordFocused || password.length > 0) && (
                                        <Box mt={8}>
                                            <Group align="center" justify="space-between">
                                                <Text size="xs">Strength</Text>
                                                <Text size="xs" c="dimmed">{strengthPercent}%</Text>
                                            </Group>
                                            <Progress mt={6} value={strengthPercent} size={8} radius="sm" color={strengthColor} />
                                        </Box>
                                    )}

                                    {/* Password Validation */}
                                    {(passwordFocused || password.length > 0) && (
                                        <Stack mt={8}>
                                            {[
                                                { label: "At least 8 characters", valid: checks.isLongEnough },
                                                { label: "1 uppercase letter", valid: checks.hasUppercase },
                                                { label: "1 lowercase letter", valid: checks.hasLowercase },
                                                { label: "1 special character", valid: checks.hasSpecialChar },
                                            ].map((req, idx) => (
                                                <Group key={idx} align="center">
                                                    <ThemeIcon
                                                        size={18} radius="xl" variant="light"
                                                        style={{
                                                            backgroundColor: req.valid ? "rgba(46,204,113,0.06)" : "transparent",
                                                            border: req.valid ? "1px solid rgba(46,204,113,0.2)" : undefined
                                                        }}
                                                    >
                                                        {req.valid ? <IconCheck size={rem(14)} stroke={3} style={{ color: "#2ecc71" }} /> : <IconX size={rem(14)} stroke={3} style={{ color: "#999" }} />}
                                                    </ThemeIcon>
                                                    <Text size="xs">{req.label}</Text>
                                                </Group>
                                            ))}
                                        </Stack>
                                    )}

                                    {errorMessage && <p className="text-blue-600 text-sm font-semibold">{errorMessage}</p>}

                                    {/* Back + Register Buttons */}
                                    <div className="flex justify-between mt-4">
                                        <Button
                                            type="button"
                                            className="bg-gray-200! text-gray-700! px-4 py-1.5 rounded-md hover:bg-gray-300! font-semibold"
                                            onClick={() => setNextField(false)}
                                        >
                                            Back
                                        </Button>
                                        <Button
                                            loading={isRegistering}
                                            type="button"
                                            className="bg-blue-600! hover:bg-blue-700! text-white px-4 py-1.5 rounded-md font-bold flex items-center"
                                            onClick={async () => {
                                                if (isRegistering) return;
                                                setIsRegistering(true);
                                                await handleRegister({
                                                    domain,
                                                    form: { firstName, lastName, userName, email, password, phoneNumber },
                                                    setErrorMessage,
                                                    setAuthState,
                                                    navigate,
                                                    redirect: redirect ?? undefined,
                                                    setShake,
                                                });
                                                setIsRegistering(false);
                                            }}
                                        >
                                            Register <MdArrowRight className="ml-1 text-xl opacity-75" />
                                        </Button>
                                    </div>
                                </Stack>
                            ) : (
                                <Stack gap="md">
                                    {/* Step 1: First Name, Last Name, Phone */}
                                    <Input
                                        variant="unstyled"
                                        type="text"
                                        placeholder="First Name"
                                        className={`w-full px-3 border text-[13px] rounded-md ${errorMessage ? "border-blue-600" : "border-black"}`}
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                    />
                                    <Input
                                        variant="unstyled"
                                        type="text"
                                        placeholder="Last Name"
                                        className={`w-full px-3 border text-[13px] rounded-md ${errorMessage ? "border-blue-600" : "border-black"}`}
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                    />
                                    <Input
                                        variant="unstyled"
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="Phone Number (e.g. 0917-123-4567)"
                                        className={`w-full px-3 border text-[13px] rounded-md ${errorMessage ? "border-blue-600" : "border-black"}`}
                                        value={phoneNumber}
                                        onChange={(e) => {
                                            const digits = digitsOnly(e.target.value);
                                            const formatted = formatPHPhone(digits);
                                            setPhoneNumber(formatted);
                                            if (errorMessage) setErrorMessage(null);
                                        }}
                                    />

                                    {errorMessage && <p className="text-blue-600 text-sm font-semibold">{errorMessage}</p>}

                                    <Button
                                        type="button"
                                        className={`w-full bg-blue-600! hover:bg-blue-700! text-white font-bold text-[13px] py-1.5 rounded-md flex justify-center items-center ${!isPhoneValid ? "opacity-50 cursor-not-allowed" : ""}`}
                                        disabled={!isPhoneValid}
                                        onClick={() => handleContinueClick({ firstName, lastName, phoneNumber, setNextField, setErrorMessage, setShake })}
                                    >
                                        Continue <MdArrowRight className="ml-1 text-xl opacity-75" />
                                    </Button>
                                </Stack>
                            )}
                        </form>
                    </div>

                    <div className="px-10 py-4 text-center rounded-lg shadow-lg">
                        <p className="text-sm">
                            Already have an account?
                            <a href="/sign-in" className="text-blue-600 hover:border-b-2 border-blue-600 font-bold ml-1">Sign in</a>
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}

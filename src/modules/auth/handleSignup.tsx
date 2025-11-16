import { notifications } from "@mantine/notifications";
import { rem } from "@mantine/core";
import { IconX } from "@tabler/icons-react";

/**
 * Utility: keep only digits
 */
export function digitsOnly(value: string) {
    return value.replace(/\D/g, "");
}

/**
 * Format Philippine mobile numbers:
 * 0917 => 0917
 * 0917123 => 0917-123
 * 09171234567 => 0917-123-4567
 *
 * Accepts digits-only input.
 */
export function formatPHPhone(digits: string) {
    const d = digits.slice(0, 11); // limit to 11 digits (09XXXXXXXXX)
    if (d.length <= 4) return d;
    if (d.length <= 7) return `${d.slice(0, 4)}-${d.slice(4)}`;
    return `${d.slice(0, 4)}-${d.slice(4, 7)}-${d.slice(7)}`;
}

/**
 * Password validation checks
 */
export function getPasswordChecks(password: string) {
    const isLongEnough = password.length >= 8;
    const isVeryLong = password.length >= 12;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
    const isPasswordValid =
        isLongEnough && hasUppercase && hasLowercase && hasSpecialChar;

    return {
        isLongEnough,
        isVeryLong,
        hasUppercase,
        hasLowercase,
        hasSpecialChar,
        isPasswordValid,
    };
}

/**
 * Password strength calculation
 * Returns percent (0..100) and suggested Mantine color name.
 */
export function getPasswordStrength(password: string) {
    const {
        isLongEnough,
        isVeryLong,
        hasUppercase,
        hasLowercase,
        hasSpecialChar,
    } = getPasswordChecks(password);

    const score =
        (isLongEnough ? 1 : 0) +
        (isVeryLong ? 1 : 0) +
        (hasUppercase ? 1 : 0) +
        (hasLowercase ? 1 : 0) +
        (hasSpecialChar ? 1 : 0);

    const percent = Math.round((score / 5) * 100);
    const color = percent < 40 ? "red" : percent < 80 ? "yellow" : "teal";

    return { percent, color, score };
}

/**
 * Trigger a mantine notifications error (used by Google login fallback)
 * Keep this here for convenience when registering Google login responses.
 */
export function showGoogleAuthError() {
    notifications.show({
        color: "#e50914",
        title: "Something went wrong with Google Auth",
        message: "",
        icon: <IconX style={{ width: rem(18), height: rem(18) }} stroke={3} />,
        autoClose: 3000,
        withCloseButton: false,
    });
}

/**
 * handleRegister
 * - Expects a params object containing current form values and various callbacks:
 *
 * params: {
 *   domain: string,
 *   form: { firstName, lastName, userName, email, password, phoneNumber },
 *   setErrorMessage: (msg: string | null) => void,
 *   setAuthState: (state: { firstName, lastName, email }) => void,
 *   navigate: (path: string) => void,
 *   redirect?: string | null,
 *   setShake?: (v:boolean) => void
 * }
 *
 * Returns: Promise<void>
 */
export async function handleRegister(params: {
    domain: string;
    form: {
        firstName: string;
        lastName: string;
        userName: string;
        email: string;
        password: string;
        phoneNumber: string; // formatted (e.g. 0917-123-4567)
    };
    setErrorMessage: (msg: string | null) => void;
    setAuthState: (s: { firstName: string; lastName: string; email: string }) => void;
    navigate: (path: string) => void;
    redirect?: string | null;
    setShake?: (v: boolean) => void;
    authorizationHeader?: string; // optional override for Authorization header
}) {
    const {
        domain,
        form,
        setErrorMessage,
        setAuthState,
        navigate,
        redirect,
        setShake,
        authorizationHeader,
    } = params;

    function triggerShake() {
        if (setShake) {
            setShake(true);
            setTimeout(() => setShake(false), 600);
        }
    }

    const { firstName, lastName, userName, email, password, phoneNumber } = form;

    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setErrorMessage("Please input a valid email");
        triggerShake();
        return;
    }

    // Required fields
    if (!userName.trim() || !email.trim() || !password.trim()) {
        setErrorMessage("Please input all required fields");
        triggerShake();
        return;
    }

    // Password validation
    const { isPasswordValid } = getPasswordChecks(password);
    if (!isPasswordValid) {
        setErrorMessage(
            "Password must be 8+ chars with uppercase, lowercase, and a special character"
        );
        triggerShake();
        return;
    }

    // Phone digits validation (11 digits expected for PH mobile numbers)
    const phoneDigits = digitsOnly(phoneNumber);
    if (!phoneDigits || phoneDigits.length < 11) {
        setErrorMessage("Please enter a valid Philippine mobile number (11 digits)");
        triggerShake();
        return;
    }

    try {
        const response = await fetch(`${domain}/client/sign-up`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(authorizationHeader
                    ? { Authorization: authorizationHeader }
                    : { Authorization: "be5grno8gvemlsg5oynbl" }),
            },
            body: JSON.stringify({
                firstname: firstName,
                lastname: lastName,
                username: userName,
                email,
                password,
                phone: phoneDigits, // send raw digits
            }),
        });

        if (!response.ok) {
            setErrorMessage("This user already exists");
            triggerShake();
            return;
        }

        const session = await response.json();

        setAuthState({
            firstName: session.firstName,
            lastName: session.lastName,
            email: session.email,
        });

        localStorage.setItem("session", session.token);
        navigate(redirect || "/my-appointments");
    } catch (error) {
        console.error("Fetch error:", error);
        setErrorMessage("Network error. Please try again.");
        triggerShake();
    }
}

/**
 * handleContinueClick
 * - Validates firstName, lastName and phone (digits present)
 * - Expects setters for nextField and error + optional shake setter
 */
export function handleContinueClick(params: {
    firstName: string;
    lastName: string;
    phoneNumber: string; // formatted
    setNextField: (v: boolean) => void;
    setErrorMessage: (m: string | null) => void;
    setShake?: (v: boolean) => void;
}) {
    const { firstName, lastName, phoneNumber, setNextField, setErrorMessage, setShake } =
        params;

    function triggerShake() {
        if (setShake) {
            setShake(true);
            setTimeout(() => setShake(false), 600);
        }
    }

    if (!firstName.trim() || !lastName.trim() || digitsOnly(phoneNumber).length < 1) {
        setErrorMessage("Please input all required fields");
        triggerShake();
        return;
    }

    setNextField(true);
    setErrorMessage(null);
}

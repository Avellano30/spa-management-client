import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../../utils/AuthContext";
import { useGoogleLogin } from "@react-oauth/google";
import { notifications } from "@mantine/notifications";
import { IconX } from "@tabler/icons-react";
import { rem } from "@mantine/core";
import LogRocket from "logrocket";
import { logger } from '../../lib/logger';  // ← add

const domain = import.meta.env.VITE_DOMAIN;

export default function useHandleLogin() {
    const [errorMessage, setErrorMessage] = useState<boolean>(false);
    const { setAuthState } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const redirect = new URLSearchParams(location.search).get("redirect");

    const handleLogin = async (email: string, password: string) => {
        setErrorMessage(false);

        try {
            const response = await fetch(`${domain}/client/auth/google`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                if (response.status === 403) {
                    const data = await response.json();
                    navigate(data.redirect);
                    return;
                }
                logger.warn('Client sign in failed', { method: 'email', email });  // ← add
                setErrorMessage(true);
                return;
            }

            const session = await response.json();

            setAuthState({ firstName: session.firstName, lastName: session.lastName, email: session.email });

            LogRocket.identify(session.userId, {
                name: `${session.firstName} ${session.lastName}`,
                email: session.email,
            });

            localStorage.setItem("session", session.token);
            logger.info('Client signed in', {
                method: 'email',
                email: session.email,
                clientName: `${session.firstName} ${session.lastName}`  // ← add
            });  // ← add
            navigate(redirect || "/");
        } catch (error) {
            console.error("There was a problem with the fetch operation:", error);
            setErrorMessage(true);
        }
    };

    const login = useGoogleLogin({
        onSuccess: async ({ code }) => {
            try {
                const response = await fetch(`${domain}/client/auth/google`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code })
                });

                if (!response.ok) {
                    if (response.status === 403) {
                        const data = await response.json();
                        navigate(data.redirect);
                        return;
                    }
                    logger.warn('Client Google sign in failed', {});  // ← add
                    notifications.show({
                        color: '#e50914',
                        title: 'Something went wrong with Google Auth',
                        message: '',
                        icon: <IconX style={{ width: rem(18), height: rem(18) }} stroke={3} />,
                        autoClose: 3000,
                        withCloseButton: false
                    });
                    return;
                }

                const tokens = await response.json();

                if (!tokens.token) {
                    navigate(tokens.redirect);
                    return;
                }

                setAuthState({ firstName: tokens.firstName, lastName: tokens.lastName, email: tokens.email });
                localStorage.setItem('session', tokens.token);
                logger.info('Client signed in', {
                    method: 'google',
                    email: tokens.email,
                    clientName: `${tokens.firstName} ${tokens.lastName}`
                });
                LogRocket.identify(tokens.userId, {
                    name: `${tokens.firstName} ${tokens.lastName}`,
                    email: tokens.email,
                });

                navigate(redirect || "/");
            } catch (error) {
                console.error('There was a problem with the fetch operation:', error);
            }
        },
        flow: 'auth-code',
    });

    return { login, handleLogin, errorMessage, setErrorMessage };
}
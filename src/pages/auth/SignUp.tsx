import { Divider, rem } from "@mantine/core";
import { useEffect, useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { useLocation, useNavigate } from "react-router";
import { useGoogleLogin } from "@react-oauth/google";
import { MdArrowRight } from "react-icons/md";
import { notifications } from "@mantine/notifications";
import { IconX } from "@tabler/icons-react";
import { useAuth } from "../../utils/AuthContext";

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
    const { setAuthState } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const redirect = new URLSearchParams(location.search).get("redirect");

    useEffect(() => {
        if (!!localStorage.getItem("session")) {
            navigate("/my-appointments");
            return;
        }
    }, [navigate]);

    const handleRegister = async () => {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setErrorMessage("Please input a valid email")
            return;
        }

        if (!userName.trim() || !email.trim() || !password.trim()) {
            setErrorMessage("Please input all required fields")
            return;
        }

        try {
            const response = await fetch(`${domain}/client/sign-up`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "be5grno8gvemlsg5oynbl"
                },
                body: JSON.stringify({ firstname: firstName, lastname: lastName, username: userName, email: email, password: password, phone: phoneNumber })
            });

            if (!response.ok) {
                setErrorMessage("This user is already exists");
                return;
            }

            const session = await response.json();

            setAuthState({ firstName: session.firstName, lastName: session.lastName, email: session.email });

            localStorage.setItem("session", session.token);

            navigate(redirect || "/my-appointments");
        } catch (error) {
            console.error("There was a problem with the fetch operation:", error);
        }
    };

    const login = useGoogleLogin({
        onSuccess: async ({ code }) => {
            try {
                const response = await fetch(`${domain}/client/auth/google`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ code })
                });

                if (!response.ok) {
                    notifications.show({
                        color: '#e50914',
                        title: 'Something went wrong with Google Auth',
                        message: '',
                        icon: <IconX style={{ width: rem(18), height: rem(18), }} stroke={3} />,
                        autoClose: 3000,
                        withCloseButton: false
                    });
                    return;
                }

                const tokens = await response.json();

                setAuthState({ firstName: tokens.firstName, lastName: tokens.lastName, email: tokens.email });

                localStorage.setItem("session", tokens.token);

                navigate(redirect || "/my-appointments");
            } catch (error) {
                console.error("There was a problem with the fetch operation:", error);
            }
        },
        flow: "auth-code",
    });

    const handleContinueClick = () => {
        let valid = true;

        if (!firstName.trim() || !lastName.trim() || !phoneNumber.trim()) {
            setErrorMessage("Please input all required fields")
            valid = false;
        } else {
            valid = true;
        }

        if (valid) {
            setNextField(true);
            setErrorMessage(null)
        }
    };

    return (
        <>
            <div className="min-h-screen flex items-center justify-center">
                <div className="max-w-[394px] w-full bg-white rounded-lg">
                    <div className="px-10 py-8 rounded-lg shadow-lg">
                        <h2 className="text-[30px] font-bold text-center text-[#e50914] mb-8">SPA</h2>
                        <h2 className="text-[17px] font-bold text-center">Create your account</h2>
                        <p className="text-[13px] mb-8 text-center">Welcome! Please fill in the details to get started</p>
                        <button
                            type="button"
                            className="flex w-full py-1.5 px-3 justify-center items-center border border-black rounded-md font-semibold text-gray-800 text-[13px] hover:drop-shadow-md"
                            onClick={() => login()}
                            data-testid="google-signup-button"
                        >
                            <FcGoogle className="text-[17px] mr-2" />Continue with Google
                        </button>
                        <div className="my-4">
                            <Divider my="xs" label={<span className="text-black">or</span>} labelPosition="center" className="font-bold text-black" color="black" />
                        </div>
                        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); }}>
                            {nextField ? (
                                <>
                                    <input
                                        type="text"
                                        placeholder="Username"
                                        className={`w-full py-1.5 px-3 border text-[13px] rounded-md ${errorMessage ? "border-[#e50914]" : "border-black"}`}
                                        value={userName}
                                        onChange={(e) => setUserName(e.target.value)}
                                        data-testid="username-register-field"
                                    />
                                    <input
                                        type="email"
                                        placeholder="Email"
                                        className={`w-full py-1.5 px-3 border text-[13px] rounded-md ${errorMessage ? "border-[#e50914]" : "border-black"}`}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        data-testid="email-register-field"
                                    />
                                    <input
                                        type="password"
                                        placeholder="Password"
                                        className={`w-full py-1.5 px-3 border text-[13px] rounded-md ${errorMessage ? "border-[#e50914]" : "border-black"}`}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        data-testid="password-register-field"
                                    />
                                    {errorMessage && (
                                        <p className="text-[#e50914] text-sm font-semibold" data-testid={`error-message`}>{errorMessage}</p>
                                    )}
                                </>
                            ) : (
                                <>
                                    <input
                                        type="text"
                                        placeholder="First Name"
                                        className={`w-full py-1.5 px-3 border text-[13px] rounded-md ${errorMessage ? "border-[#e50914]" : "border-black"}`}
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        data-testid="firstname-register-field"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Last Name"
                                        className={`w-full py-1.5 px-3 border text-[13px] rounded-md ${errorMessage ? "border-[#e50914]" : "border-black"}`}
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        data-testid="lastname-register-field"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Phone Number"
                                        className={`w-full py-1.5 px-3 border text-[13px] rounded-md ${errorMessage ? "border-[#e50914]" : "border-black"}`}
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        data-testid="lastname-register-field"
                                    />
                                    {errorMessage && (
                                        <p className="text-[#e50914] text-sm font-semibold">{errorMessage}</p>
                                    )}
                                </>
                            )}

                            <button
                                type={nextField ? "button" : "submit"}
                                className="w-full bg-[#e50914] hover:bg-red-700 text-white font-bold text-[13px] py-1.5 rounded-md flex justify-center items-center"
                                data-testid="register-button"
                                onClick={nextField ? handleRegister : handleContinueClick}
                            >
                                {nextField ? "Register" : "Continue"}
                                <MdArrowRight className="ml-1 text-xl opacity-75" />
                            </button>
                        </form>
                    </div>
                    <div className="px-10 py-4 text-center rounded-lg shadow-lg">
                        <p className="text-sm">
                            Already have an account?
                            <a href="/sign-in" className="text-[#e50914] hover:border-b-2 border-[#e50914] font-bold ml-1" data-testid="signin-button">Sign in</a>
                        </p>
                    </div>
                </div>
            </div>
        </>
    )
}
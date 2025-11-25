import { Divider, Input, PasswordInput, Stack } from "@mantine/core";
import { useEffect, useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { MdArrowRight } from "react-icons/md";
import { Link, useLocation, useNavigate } from "react-router";
import useHandleLogin from "../../modules/auth/handleLogin";

export default function SignIn() {
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const { login, handleLogin, errorMessage } = useHandleLogin();
    const navigate = useNavigate();
    const location = useLocation();
    const redirect = new URLSearchParams(location.search).get("redirect");
    useEffect(() => {
        if (localStorage.getItem("session")) {
            navigate(redirect || "/my-appointments");
            return;
        }
    });


    return (
        <>
            <div className="min-h-screen flex items-center justify-center">
                <div className="max-w-[394px] w-full bg-white rounded-lg">
                    <div className="px-10 py-8 rounded-lg shadow-lg">
                        <h2 className="text-[30px] font-bold text-center text-blue-600 mb-8">SPA</h2>
                        <h2 className="text-[17px] font-bold text-center">Login into your account</h2>
                        <p className="text-[13px] mb-8 text-center">Welcome back! Please sign in to continue</p>
                        <button
                            type="button"
                            className="flex w-full py-1.5 px-3 justify-center items-center border border-black rounded-md font-semibold text-gray-800 text-[13px] hover:drop-shadow-md"
                            onClick={() => login()}
                            data-testid="google-login-button"
                        >
                            <FcGoogle className="text-[17px] mr-2" />Continue with Google
                        </button>
                        <div className="my-4">
                            <Divider my="xs" label={<span className="text-black">or</span>} labelPosition="center" className="font-bold text-black" color="black" />
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); handleLogin(email, password) }}>
                            <Stack gap="md">
                                <Input
                                    variant="unstyled"
                                    type="text"
                                    placeholder="Email"
                                    className={`w-full px-3 border text-[13px] rounded-md ${errorMessage ? "border-blue-700" : "border-black"}`}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    data-testid="email-login-field"
                                />
                                <PasswordInput
                                    variant="unstyled"
                                    type="password"
                                    placeholder="Password"
                                    className={`w-full px-3 border text-[13px] rounded-md ${errorMessage ? "border-blue-700" : "border-black"}`}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    data-testid="password-login-field"
                                />
                                {errorMessage && (
                                    <p className="text-blue-600 text-[13px] font-semibold" data-testid={`error-message`}>Incorrect email or password.</p>
                                )}
                                <button
                                    type="submit"
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] py-1.5 rounded-md flex justify-center items-center"
                                    data-testid="login-button"
                                >
                                    Sign In
                                    <MdArrowRight className="ml-1 text-xl opacity-75" />
                                </button>
                            </Stack>
                        </form>
                    </div>
                    <div className="px-10 py-4 text-center rounded-lg shadow-lg">
                        <p className="text-sm flex justify-between">
                            <Link
                                to={`/sign-up${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`}
                                className="text-blue-600 hover:border-b-2 border-blue-700 font-semibold"
                                data-testid="signup-button"
                            >
                                Don't have an account?
                            </Link>
                            <Link
                                to="/password-reset"
                                className="text-blue-600 hover:border-b-2 border-blue-700 font-semibold"
                                data-testid="password-reset-button"
                            >
                                Forgot Password?
                            </Link>
                        </p>
                    </div>
                </div>

            </div>
        </>
    )
}
import { useNavigate } from "react-router";
import { useAuth } from "../../utils/AuthContext";

export default function useHandleLogout() {
    const { setAuthState } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        setAuthState(null);
        localStorage.removeItem("session");
        localStorage.removeItem("termsAgreed");
        navigate("/");
    };

    return {handleLogout};
}
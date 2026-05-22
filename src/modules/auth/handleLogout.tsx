import { useNavigate } from "react-router";
import { useAuth } from "../../utils/AuthContext";
import { logger } from '../../lib/logger';

export default function useHandleLogout() {
    const { setAuthState } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logger.info('Client signed out', {});
        setAuthState(null);
        localStorage.removeItem("session");
        localStorage.removeItem("termsAgreed");
        navigate("/");
    };

    return {handleLogout};
}
import { createContext, useContext } from "react";
import { type HomepageSettings } from "../api/settings";

export const HomepageSettingsContext = createContext<HomepageSettings | null>(null);

export const useHomepageSettings = () => {
    return useContext(HomepageSettingsContext);
};

import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";

// Define the shape of the authentication state
interface AuthState {
  firstName: string;
  lastName: string;
  email: string;
}

// Define the shape of the context value
interface AuthContextType {
  authState: AuthState | null;
  setAuthState: React.Dispatch<React.SetStateAction<AuthState | null>>;
}

// Create the context with the correct type
const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState | null>(() => {
    const savedAuthState = localStorage.getItem("user");
    return savedAuthState ? JSON.parse(savedAuthState) : null;
  });

  useEffect(() => {
    if (authState) {
      localStorage.setItem("user", JSON.stringify(authState));
    } else {
      localStorage.removeItem("user");
    }
  }, [authState]);

  
  return (
    <AuthContext.Provider value={{ authState, setAuthState }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
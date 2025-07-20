import { createContext, useContext } from 'react';
import { useAuthQuery, useAuthMutations } from '@/hooks/use-auth';

interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email?: string;
  isSuperUser: boolean;
  role: string;
  clubs: any[];
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refetchUser: () => void;
  isLoginPending: boolean;
  isLogoutPending: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { data: user, isLoading, refetch: refetchUser } = useAuthQuery();
  const { login, logout, isLoginPending, isLogoutPending } = useAuthMutations();

  const isAuthenticated = !!user;

  const contextValue: AuthContextType = {
    user: user ?? null,
    isLoading,
    isAuthenticated,
    login: async (username: string, password: string) => {
      return await login({ username, password });
    },
    logout,
    refetchUser,
    isLoginPending,
    isLogoutPending,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
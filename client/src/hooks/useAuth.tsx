import { useState, useEffect, createContext, useContext } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface User {
  id: string;
  email: string;
  username: string | null;
  credits: number;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  // Query to fetch current user data
  const { data: userData, refetch: refetchUser } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const token = localStorage.getItem('firebase_token');
      if (!token) return null;
      
      const response = await fetch('/api/auth/firebase-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token })
      });
      
      if (!response.ok) return null;
      const result = await response.json();
      return result.user;
    },
    enabled: false,
    staleTime: 30000, // 30 seconds
  });

  useEffect(() => {
    const token = localStorage.getItem('firebase_token');
    if (token) {
      refetchUser();
    } else {
      setIsLoading(false);
    }
  }, [refetchUser]);

  useEffect(() => {
    if (userData) {
      setUser(userData);
    }
    setIsLoading(false);
  }, [userData]);

  const login = async (token: string) => {
    localStorage.setItem('firebase_token', token);
    setIsLoading(true);
    await refetchUser();
  };

  const logout = () => {
    localStorage.removeItem('firebase_token');
    setUser(null);
    queryClient.clear();
  };

  const refreshUser = () => {
    refetchUser();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
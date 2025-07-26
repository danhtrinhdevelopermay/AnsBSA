import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import WebBuilder from "@/pages/web-builder";
import { UserManagement } from "@/pages/user-management";
import NotFound from "@/pages/not-found";
import { Login } from "@/components/auth/login";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/components/firebase-config";

interface User {
  id: string;
  email: string;
  username: string | null;
  credits: number;
  role: string;
}

function Router({ user }: { user: User | null }) {
  return (
    <Switch>
      <Route path="/" component={() => <Home user={user} />} />
      <Route path="/web-builder" component={WebBuilder} />
      <Route path="/admin/users" component={() => <UserManagement user={user} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get ID token and sync with backend
          const idToken = await firebaseUser.getIdToken();
          const response = await fetch('/api/auth/firebase-login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ idToken }),
          });

          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
          } else {
            setUser(null);
          }
        } catch (error) {
          console.error('Auth sync error:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = (userData: User) => {
    setUser(userData);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Đang tải...</div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {user ? (
          <Router user={user} />
        ) : (
          <Login onLoginSuccess={handleLoginSuccess} />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
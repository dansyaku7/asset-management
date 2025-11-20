// File: components/AuthContext.tsx

"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';

interface DecodedUser {
    userId: number;
    fullName: string;
    email: string;
    role: string;
    permissions: string[];
}

interface AuthContextType {
    user: DecodedUser | null;
    logout: () => void;
    isAuthenticated: boolean;
    hasPermission: (permission: string) => boolean;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<DecodedUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (token) {
            try {
                const decoded: DecodedUser = jwtDecode(token);
                setUser(decoded);
            } catch (error) {
                console.error("Invalid token:", error);
                localStorage.removeItem('authToken');
                setUser(null);
            }
        }
        setIsLoading(false);
    }, []);

    const logout = () => {
        localStorage.removeItem('authToken');
        setUser(null);
        window.location.href = '/';
    };

    const hasPermission = (permission: string): boolean => {
        if (!user) return false;
        if (user.role === 'SUPER_ADMIN') return true;
        return user.permissions.includes(permission);
    };

    const isAuthenticated = !!user;

    const value = { user, logout, isAuthenticated, hasPermission, isLoading };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
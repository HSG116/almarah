import * as React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
    useQuery,
    useMutation,
    UseMutationResult,
} from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { InsertUser, User as SelectUser } from "@shared/schema";
import { toast } from "@/hooks/use-toast";
import { supabase } from "../lib/supabase";

type AuthContextType = {
    user: SelectUser | null;
    isLoading: boolean;
    error: Error | null;
    loginMutation: UseMutationResult<any, Error, LoginData>;
    logoutMutation: UseMutationResult<void, Error, void>;
    registerMutation: UseMutationResult<any, Error, any>;
    verifyOtpMutation: UseMutationResult<any, Error, any>;
};

type LoginData = { email: string; password: string };

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<any>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            queryClient.invalidateQueries({ queryKey: ["auth_user"] });
        });

        return () => subscription.unsubscribe();
    }, [queryClient]);

    const {
        data: user,
        error,
        isLoading,
    } = useQuery<SelectUser | null, Error>({
        queryKey: ["auth_user", session?.user?.id],
        queryFn: async () => {
            if (!session?.user) return null;

            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (error || !data) {
                // Fallback struct if DB record missing
                return {
                    id: session.user.id,
                    email: session.user.email || "",
                    username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || "User",
                    isAdmin: session.user.user_metadata?.isAdmin || false,
                    phone: session.user.phone || "",
                    address: session.user.user_metadata?.address || null,
                    city: session.user.user_metadata?.city || null,
                    district: session.user.user_metadata?.district || null,
                    street: session.user.user_metadata?.street || null,
                    building: session.user.user_metadata?.building || null,
                    landmark: session.user.user_metadata?.landmark || null,
                    gpsLat: session.user.user_metadata?.gpsLat || null,
                    gpsLng: session.user.user_metadata?.gpsLng || null,
                    password: "", // Not needed on client
                } as SelectUser;
            }

            if (data) {
                return {
                    ...data,
                    isAdmin: data.is_admin === true,
                    isBanned: data.is_banned === true,
                    role: data.role || "customer",
                    permissions: data.permissions || [],
                } as unknown as SelectUser;
            }

            return data as SelectUser;
        },
        enabled: !!session?.user,
    });

    const loginMutation = useMutation({
        mutationFn: async (credentials: LoginData) => {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: credentials.email,
                password: credentials.password,
            });
            if (error) throw error;
            return data.user;
        },
        onSuccess: () => {
            // Toast handled in component or here
        },
        onError: (error: Error) => {
            toast({
                title: "فشل تسجيل الدخول",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const registerMutation = useMutation({
        mutationFn: async (userData: InsertUser & { email: string; skipEmailConfirm?: boolean }) => {
            console.log('📝 Starting registration with data:', userData);

            // 1. SignUp with Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: userData.email,
                password: userData.password,
                options: {
                    data: {
                        username: userData.username,
                        phone: userData.phone,
                    },
                    emailRedirectTo: window.location.origin,
                }
            });

            if (authError) {
                console.error('❌ Auth signup error:', authError);
                throw authError;
            }
            if (!authData.user) throw new Error("No user data returned");

            console.log('✅ Auth user created:', authData.user.id);

            // 2. Create user profile in database
            // The trigger should handle this, but we'll do it manually to ensure all data is saved
            const { error: dbError } = await supabase
                .from('users')
                .upsert({
                    id: authData.user.id,
                    username: userData.username,
                    email: userData.email,
                    phone: userData.phone,
                    is_admin: false,
                }, {
                    onConflict: 'id'
                });

            if (dbError && dbError.code !== '23505') {
                console.error('❌ Database profile error:', dbError);
                // Don't throw - user is created in auth, just log the error
            } else {
                console.log('✅ User profile saved with phone:', userData.phone);
            }

            return authData.user;
        },
        onSuccess: () => {
            console.log('✅ Registration completed successfully');
        },
        onError: (error: Error) => {
            console.error('🔴 Registration error:', error);
            console.error('Error message:', error.message);

            // Don't show error toast if user already exists
            if (error.message.includes("already") || error.message.includes("registered") || error.message.includes("exists") || error.message.includes("User")) {
                console.log('ℹ️ User already registered (suppressing global error toast)');
                return;
            }

            toast({
                title: "فشل إنشاء الحساب",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const verifyOtpMutation = useMutation({
        mutationFn: async ({ email, token, type }: { email: string, token: string, type: 'signup' | 'recovery' | 'magiclink' }) => {
            const { data, error } = await supabase.auth.verifyOtp({
                email,
                token,
                type,
            });
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            toast({
                title: "تم التحقق بنجاح",
                description: "تم تفعيل حسابك، جاري تسجيل الدخول...",
            });
            queryClient.invalidateQueries({ queryKey: ["auth_user"] });
        },
        onError: (error: Error) => {
            toast({
                title: "فشل التحقق",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const logoutMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.setQueryData(["auth_user"], null);
            toast({
                title: "تم تسجيل الخروج",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "فشل تسجيل الخروج",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    return (
        <AuthContext.Provider
            value={{
                user: user ?? null,
                isLoading,
                error,
                loginMutation,
                logoutMutation,
                registerMutation,
                verifyOtpMutation,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

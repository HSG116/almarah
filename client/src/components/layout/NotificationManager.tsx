import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

/**
 * NotificationManager handles real-time notifications via Supabase
 * It listens for new rows in the 'notifications' table for the current user.
 */
export function NotificationManager() {
    const { user } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        if (!user) return;

        // Subscribe to notifications for the current user
        const channel = supabase
            .channel(`user_notifs_${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    const notification = payload.new;

                    // 1. Play notification sound
                    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                    audio.play().catch(() => {
                        // Browsers often block auto-play without user interaction
                        console.log("Notification sound blocked by browser");
                    });

                    // 2. Show toast notification
                    toast({
                        title: notification.title || "تنبيه جديد",
                        description: notification.message,
                        className: "bg-primary text-white border-none text-right font-bold shadow-2xl",
                    });
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Real-time notifications active');
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, toast]);

    return null;
}

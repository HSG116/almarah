import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect, ReactNode } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ProtectedRouteProps {
    children: ReactNode;
    allowedRoles?: string[];
    requireAdmin?: boolean;
    redirectTo?: string;
}

/**
 * حماية قوية للمسارات بناءً على الصلاحيات
 * Strong route protection based on permissions
 */
export function ProtectedRoute({
    children,
    allowedRoles,
    requireAdmin = false,
    redirectTo = "/",
}: ProtectedRouteProps) {
    const { user, isLoading } = useAuth();
    const [location, setLocation] = useLocation();

    useEffect(() => {
        // لا تفعل شيئاً أثناء التحميل
        if (isLoading) return;

        // 1. إذا لم يكن هناك مستخدم، اذهب لصفحة تسجيل الدخول
        if (!user) {
            if (location !== "/auth" && location !== "/admin/login") {
                setLocation("/auth");
            }
            return;
        }

        // 2. حماية ضد الحسابات المحظورة
        if (user.isBanned) {
            toast({
                title: "حساب محظور",
                description: "تم حظر وصولك لهذا الموقع. يرجى التواصل مع الإدارة.",
                variant: "destructive",
            });
            setLocation("/auth");
            return;
        }

        const role = user.role || "customer";
        const isAdmin = user.isAdmin === true || role === "admin";

        // 3. حماية منطقة الإدارة
        if (requireAdmin && !isAdmin) {
            toast({
                title: "دخول ممنوع",
                description: "لا تملك صلاحيات كافية للدخول لهذه الصفحة.",
                variant: "destructive",
            });
            setLocation(redirectTo);
            return;
        }

        // 4. حماية المسارات المخصصة لوظائف معينة (جزار، توصيل، إلخ)
        if (allowedRoles && !allowedRoles.includes(role) && !isAdmin) {
            toast({
                title: "دخول غير مصرح",
                description: "هذه الصفحة مخصصة للموظفين المعنيين فقط.",
                variant: "destructive",
            });
            setLocation(redirectTo);
            return;
        }
    }, [user, isLoading, allowedRoles, requireAdmin, redirectTo, setLocation, location]);

    // عرض واجهة تحميل أثناء التحقق
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground font-bold font-heading">جاري التحقق من الصلاحيات...</p>
            </div>
        );
    }

    // إذا لم يكن هناك مستخدم، لا تظهر شيئاً ليتم التوجيه في useEffect
    if (!user) return null;

    const role = user.role || "customer";
    const isAdmin = user.isAdmin === true || role === "admin";

    // التحقق النهائي قبل الرندر
    if (requireAdmin && !isAdmin) return null;
    if (allowedRoles && !allowedRoles.includes(role) && !isAdmin) return null;

    // كل شيء تمام، اظهر المحتوى
    return <>{children}</>;
}

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Lock, User, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function AdminLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const { user, loginMutation } = useAuth();

    useEffect(() => {
        if (user) {
            if (user.isAdmin || user.role === 'admin') {
                setLocation("/admin/dashboard");
            } else if (user.role && user.role !== 'customer') {
                setLocation("/staff");
            }
        }
    }, [user, setLocation]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        loginMutation.mutate({ email, password });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4" dir="rtl">
            <div className="absolute inset-0 bg-grid-black/[0.02] -z-10" />

            <Card className="w-full max-w-md shadow-xl border-gray-100">
                <CardHeader className="space-y-1 text-center pb-8 border-b border-gray-50 bg-white/50 rounded-t-xl">
                    <div className="flex items-center justify-center mx-auto mb-6">
                        <img src="/uploads/LOGO.png" alt="المراح" className="w-32 h-32 object-contain drop-shadow-md" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-900">لوحة الإدارة</CardTitle>
                    <CardDescription className="text-base">
                        الرجاء إدخال بيانات الدخول للمتابعة
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-8 px-6 md:px-8 bg-white rounded-b-xl">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="email">البريد الإلكتروني</Label>
                            <div className="relative">
                                <User className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="admin@example.com"
                                    className="pr-10 h-11"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    dir="ltr"
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">كلمة المرور</Label>
                            <div className="relative">
                                <Lock className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    className="pr-10 h-11"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    dir="ltr"
                                    required
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-11 text-base font-bold bg-primary hover:bg-primary/90 mt-4"
                            disabled={loginMutation.isPending}
                        >
                            {loginMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                            دخول
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

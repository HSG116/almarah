import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, InsertUser } from "@shared/schema";
import { Loader2, ShieldCheck, Mail, Send, CheckCircle2, ArrowRight, MessageSquare, Star, UserCircle, Phone } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { CountrySelect } from "@/components/ui/country-select";

type AuthStep = "form" | "selection" | "otp" | "onboarding";

export default function Auth() {
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation, verifyOtpMutation, loginWithGoogleMutation, completeProfileMutation } = useAuth();
  const [step, setStep] = useState<AuthStep>("form");
  const [otpMethod, setOtpMethod] = useState<"gmail" | "telegram" | null>(null);
  const [otpValue, setOtpValue] = useState("");
  const { toast } = useToast();

  // Redirect Logic: Immediately send staff to their dashboards upon login
  useEffect(() => {
    if (user) {
      // 1. If user has no phone, they MUST complete onboarding (common for Google signups)
      if (!user.phone) {
        setStep("onboarding");
        return; // 🛑 CRITICAL: Stop here so we don't redirect away
      }

      // 2. If phone exists, user is fully registered. Redirect to appropriate dashboard.
      const confinedRoles = ['delivery', 'butcher', 'accountant', 'support', 'designer', 'manager'];

      if (user.role && confinedRoles.includes(user.role)) {
        setLocation(`/${user.role}`);
      } else {
        setLocation("/"); // Customers and Admins default home
      }
    }
  }, [user, setLocation, step]);

  const loginForm = useForm<{ email: string; password: string }>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      email: "",
      phone: "",
    },
  });

  const passwordValue = registerForm.watch("password");

  const passwordStrength = useMemo(() => {
    if (!passwordValue) return 0;
    let strength = 0;
    if (passwordValue.length >= 6) strength += 25;
    if (/[A-Z]/.test(passwordValue)) strength += 25;
    if (/[0-9]/.test(passwordValue)) strength += 25;
    if (/[^A-Za-z0-9]/.test(passwordValue)) strength += 25;
    return strength;
  }, [passwordValue]);

  const getStrengthColor = (s: number) => {
    if (s <= 25) return "bg-red-500";
    if (s <= 50) return "bg-orange-400";
    if (s <= 75) return "bg-yellow-400";
    return "bg-green-500";
  };

  const getStrengthText = (s: number) => {
    if (s <= 25) return "ضعيفة";
    if (s <= 50) return "متوسطة";
    if (s <= 75) return "جيدة";
    return "قوية جداً";
  };

  const handleRegisterSubmit = (data: InsertUser) => {
    // Just move to selection, allow user to choose method
    setStep("selection");
  };

  // No changes to logic, just context to ensure file match if needed.
  // Proceeding to replace the Return statement in the next block.
  // Actually, I will replace the LOGIC and RETURN to be safe and ensure the structure is perfect.

  // --- Telegram & Phone Logic ---
  const [countryCode, setCountryCode] = useState("+966");
  const [telegramToken, setTelegramToken] = useState<string | null>(null);
  const [telegramLink, setTelegramLink] = useState<string | null>(null);

  const handleMethodSelect = async (method: "gmail" | "telegram") => {
    if (method === "gmail") {
      setOtpMethod("gmail");
      const data = registerForm.getValues();
      registerMutation.mutate({ ...data, email: data.email }, {
        onSuccess: () => { setStep("otp"); toast({ title: "تم إرسال الرمز", description: "تفقد بريدك الإلكتروني" }); },
        onError: async (err) => {
          if (err.message.includes("registered") || err.message.includes("exists")) {
            const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: data.email });
            if (!resendError) { setStep("otp"); toast({ title: "الحساب موجود", description: "تم إعادة إرسال رمز التحقق" }); return; }
          }
        }
      });
    } else {
      // Telegram Deep Link Flow
      setOtpMethod("telegram");

      const rawPhone = registerForm.getValues().phone;
      if (!rawPhone) {
        toast({ title: "الرجاء إدخال رقم الهاتف", variant: "destructive" });
        return;
      }
      let fullPhone = rawPhone.startsWith('0') ? rawPhone.substring(1) : rawPhone;
      fullPhone = countryCode.replace('+', '') + fullPhone;

      // Helper function to initialize telegram
      const initTelegram = async () => {
        try {
          console.log('🚀 Initializing Telegram verification for:', fullPhone);
          const res = await fetch('/api/auth/telegram/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: fullPhone })
          });

          const text = await res.text();
          console.log('📥 Server response:', text);

          if (!text) throw new Error('السيرفر رد برد فارغ');

          const data = JSON.parse(text);
          if (res.ok) {
            console.log('✅ Telegram link generated:', data.link);
            setTelegramToken(data.token);
            setTelegramLink(data.link);
            setStep("otp");
            toast({ title: "✅ جاهز للتحقق", description: "اضغط على الزر للانتقال لتيليجرام" });
          } else {
            console.error('❌ Server returned error:', data.message);
            toast({ title: "فشل إنشاء رابط التحقق", description: data.message, variant: "destructive" });
          }
        } catch (e) {
          console.error('❌ Telegram init error:', e);
          toast({ title: "خطأ في الاتصال", description: String(e), variant: "destructive" });
        }
      };

      // First, create the account in Supabase (or check if exists)
      const formData = registerForm.getValues();
      const registrationData = { ...formData, phone: fullPhone };
      console.log('📝 Attempting to register with data:', { username: registrationData.username, email: registrationData.email, phone: fullPhone });

      registerMutation.mutate(registrationData, {
        onSuccess: async () => {
          // Account created successfully
          console.log('✅ Account created successfully, now signing out to wait for Telegram verification');

          // Sign out immediately - don't auto-login yet!
          await supabase.auth.signOut();

          // Initialize Telegram
          await initTelegram();
        },
        onError: async (err: any) => {
          console.log('⚠️ Registration error received in component:', err.message);
          const errorMsg = err.message.toLowerCase();

          // Account already exists - this is OK for Telegram, just proceed
          if (
            errorMsg.includes("registered") ||
            errorMsg.includes("already") ||
            errorMsg.includes("exists") ||
            errorMsg.includes("user")
          ) {
            console.log('ℹ️ Account already exists (matched condition), proceeding with Telegram verification');

            // Make sure we're signed out
            await supabase.auth.signOut();

            // Initialize Telegram anyway
            await initTelegram();
          } else {
            // Real error, show it
            console.error('❌ Real registration error:', err.message);
            toast({ title: "خطأ في التسجيل", description: err.message, variant: "destructive" });
          }
        }
      });
    }
  };

  // Polling Effect for Telegram
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'otp' && otpMethod === 'telegram' && telegramToken) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/auth/telegram/status?token=${telegramToken}`);
          const data = await res.json();
          if (data.status === 'VERIFIED') {
            clearInterval(interval);
            toast({ title: "✅ تم التحقق بنجاح!", description: "جاري تسجيل الدخول..." });

            // Account already created, just sign in
            const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
              email: registerForm.getValues().email,
              password: registerForm.getValues().password
            });

            console.log('Login attempt result:', { loginData, loginError });

            if (!loginError && loginData.session) {
              toast({ title: "✅ تم تسجيل الدخول بنجاح!" });
              setLocation("/");
            } else if (loginError?.message.includes('Email not confirmed')) {
              // Email not confirmed - try to get session anyway
              toast({
                title: "تنبيه",
                description: "الرجاء تأكيد بريدك الإلكتروني. تحقق من صندوق الوارد.",
                variant: "destructive"
              });
              // Still try to navigate if there's a session
              const { data: { session } } = await supabase.auth.getSession();
              if (session) {
                setLocation("/");
              }
            } else {
              toast({
                title: "خطأ في تسجيل الدخول",
                description: loginError?.message || 'خطأ غير معروف',
                variant: "destructive"
              });
            }
          }
        } catch (e) {
          // ignore poll errors silently
        }
      }, 3000); // Check every 3 seconds
    }
    return () => clearInterval(interval);
  }, [step, otpMethod, telegramToken]);

  const verifyOtp = () => {
    if (otpValue.length === 6) {
      if (otpMethod === 'gmail') {
        verifyOtpMutation.mutate({
          email: registerForm.getValues().email,
          token: otpValue,
          type: 'signup'
        });
      }
    }
  };

  // Strong "Brand Red" Theme (Clean, Modern, Powerful) - FIXED LAYOUT (GRID SYSTEM)
  return (
    <div className="min-h-screen w-full flex flex-col bg-[#FAFAFA] font-sans overflow-hidden relative selection:bg-red-500/30 text-zinc-900">
      <Navbar />

      {/* --- Dynamic Background Atmosphere (Light & Red) --- */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Subtle pattern */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] invert" />

        {/* Animated Orbs (Red/Crimson) */}
        <motion.div
          animate={{ x: [0, 50, 0], y: [0, -30, 0], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-red-600/5 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{ x: [0, -50, 0], y: [0, 40, 0], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-20%] right-[-10%] w-[700px] h-[700px] bg-red-800/5 rounded-full blur-[120px]"
        />
      </div>

      <div className="relative z-10 flex-1 w-full max-w-7xl mx-auto flex flex-col justify-center px-4 lg:px-12 py-8">

        {/* Mobile Header Logo (Visible only on mobile) */}
        <div className="lg:hidden flex flex-col items-center gap-6 mb-12 w-full mt-12">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-40 h-40 flex items-center justify-center relative"
          >
            <img src="/logo.png" alt="المراح" className="w-full h-full object-contain drop-shadow-2xl" />
          </motion.div>
          <div className="text-center">
            <h1 className="text-5xl font-black text-zinc-900 tracking-tighter">المراح</h1>
            <p className="text-base font-bold text-primary tracking-[0.2em] uppercase mt-2">Al Marah Butchery</p>
          </div>
        </div>

        {/* Desktop Layout: 2 Columns (Hero Right, Form Left) */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center w-full">

          {/* 1. Hero Section (Right Side in RTL) - Polished Alignment */}
          <motion.div
            className="hidden lg:flex flex-col items-start text-right w-full order-last lg:order-first"
            dir="rtl"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {/* Header: Logo and Title Horizontal row - STRICT RIGHT ALIGNMENT */}
            <div className="flex flex-row items-center justify-start gap-8 mb-10 w-full select-none">
              {/* Logo */}
              <div className="relative shrink-0">
                <img src="/logo.png" alt="المراح" className="w-36 h-36 lg:w-44 lg:h-44 object-contain drop-shadow-2xl" />
              </div>

              {/* Title (Single Line - Forced) */}
              <div className="flex flex-col pt-4">
                <h1 className="text-7xl lg:text-9xl font-black text-zinc-900 leading-none tracking-tighter whitespace-nowrap">
                  المراح
                </h1>
                <p className="text-2xl font-bold text-primary tracking-[0.3em] uppercase mt-4">Al Marah Butchery</p>
              </div>
            </div>

            {/* Description */}
            <p className="text-xl text-gray-500 font-bold leading-relaxed max-w-lg text-right mb-8 pr-1">
              نقدم لك أفضل تجربة شرائية للحوم الطازجة. <br /> جودة تليق بك وبأحبابك.
            </p>

            {/* USP Buttons */}
            <div className="flex gap-4 w-full justify-start pr-1">
              <div className="px-6 py-3 bg-white rounded-2xl shadow-sm border border-red-50 flex items-center gap-3 hover:shadow-md transition-all group cursor-default">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse group-hover:scale-110 transition-transform" />
                <span className="font-extrabold text-gray-700 text-base">توصيل اليوم</span>
              </div>
              <div className="px-6 py-3 bg-white rounded-2xl shadow-sm border border-red-50 flex items-center gap-3 hover:shadow-md transition-all group cursor-default">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse group-hover:scale-110 transition-transform" />
                <span className="font-extrabold text-gray-700 text-base">ذبح يومي</span>
              </div>
            </div>
          </motion.div>

          {/* 2. Interactive Form Card (Left Side in RTL) */}
          <motion.div
            className="w-full max-w-[500px] mx-auto lg:mr-auto lg:ml-0 relative z-20"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, type: "spring" }}
          >
            <div className="bg-white/80 backdrop-blur-3xl border border-white/60 rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(185,28,28,0.1)] p-6 sm:p-8 relative overflow-hidden ring-1 ring-red-900/5">

              {/* Header */}
              <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-zinc-900 mb-2 font-heading tracking-tight">
                  {step === 'form' ? 'تفضل بالدخول' : step === 'selection' ? 'تفعيل الحساب' : 'التحقق'}
                </h2>
                <p className="text-gray-500 font-bold text-sm">
                  {step === 'form' ? 'سجل دخولك أو أنشئ حساباً جديداً' : 'أكمل الخطوات البسيطة للتفعيل'}
                </p>
              </div>

              <AnimatePresence mode="wait">
                {step === "form" && (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <Tabs defaultValue="login" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 mb-8 bg-gray-50/80 p-1.5 rounded-2xl h-16 border border-gray-100">
                        <TabsTrigger value="login" className="rounded-xl h-full font-bold text-gray-500 text-lg data-[state=active]:bg-white data-[state=active]:text-[#B91C1C] data-[state=active]:shadow-[0_4px_20px_-5px_rgba(185,28,28,0.15)] transition-all duration-300">تسجيل دخول</TabsTrigger>
                        <TabsTrigger value="register" className="rounded-xl h-full font-bold text-gray-500 text-lg data-[state=active]:bg-white data-[state=active]:text-[#B91C1C] data-[state=active]:shadow-[0_4px_20px_-5px_rgba(185,28,28,0.15)] transition-all duration-300">حساب جديد</TabsTrigger>
                      </TabsList>

                      <TabsContent value="login" className="mt-0 space-y-6">
                        <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-6">
                          <div className="space-y-2">
                            <Label className="text-gray-700 font-extrabold text-sm mr-2">البريد الإلكتروني</Label>
                            <Input
                              {...loginForm.register("email")}
                              dir="ltr"
                              className="h-16 bg-white border-gray-200 focus:border-red-500/50 focus:ring-4 focus:ring-red-500/10 rounded-2xl transition-all text-xl px-4 shadow-sm text-zinc-800 placeholder:text-gray-300 font-medium"
                              placeholder="name@example.com"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-gray-700 font-extrabold text-sm mr-2">كلمة المرور</Label>
                            <Input
                              type="password"
                              {...loginForm.register("password")}
                              className="h-16 bg-white border-gray-200 focus:border-red-500/50 focus:ring-4 focus:ring-red-500/10 rounded-2xl transition-all text-xl px-4 shadow-sm text-zinc-800 tracking-widest placeholder:text-gray-300 font-medium"
                              placeholder="••••••••"
                            />
                          </div>
                          <Button
                            type="submit"
                            disabled={loginMutation.isPending}
                            className="w-full h-16 rounded-2xl bg-[#B91C1C] hover:bg-[#991B1B] text-white font-black text-2xl shadow-[0_10px_30px_-10px_rgba(185,28,28,0.4)] hover:shadow-[0_20px_40px_-10px_rgba(185,28,28,0.5)] active:scale-[0.98] transition-all duration-300 mt-4"
                          >
                            {loginMutation.isPending ? <Loader2 className="animate-spin w-8 h-8" /> : "دخول"}
                          </Button>
                        </form>
                      </TabsContent>

                      <TabsContent value="register" className="mt-0 space-y-4">
                        <form onSubmit={registerForm.handleSubmit(handleRegisterSubmit)} className="space-y-4">
                          <Input {...registerForm.register("username")} dir="ltr" placeholder="اسم المستخدم" className="h-14 bg-white border-gray-200 rounded-xl focus:border-red-500/30 focus:ring-red-500/10 transition-all font-medium text-lg" />
                          <Input {...registerForm.register("email")} type="email" dir="ltr" placeholder="البريد الإلكتروني" className="h-14 bg-white border-gray-200 rounded-xl focus:border-red-500/30 focus:ring-red-500/10 transition-all font-medium text-lg" />
                          <div className="flex gap-2" dir="ltr">
                            <CountrySelect value={countryCode} onChange={setCountryCode} />
                            <Input
                              {...registerForm.register("phone")}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '').slice(0, 13);
                                registerForm.setValue("phone", value);
                              }}
                              type="tel"
                              maxLength={13}
                              placeholder="5xxxxxxxx"
                              className="h-14 bg-white border-gray-200 rounded-xl focus:border-red-500/30 focus:ring-red-500/10 flex-1 font-bold text-lg transition-all"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <Input type="password" {...registerForm.register("password")} placeholder="كلمة المرور" className="h-14 bg-white border-gray-200 rounded-xl focus:border-red-500/30 focus:ring-red-500/10 transition-all font-medium text-lg" />
                            <Input type="password" {...registerForm.register("confirmPassword")} placeholder="تأكيدها" className="h-14 bg-white border-gray-200 rounded-xl focus:border-red-500/30 focus:ring-red-500/10 transition-all font-medium text-lg" />
                          </div>

                          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden mt-2">
                            <div className={`h-full transition-all duration-500 ${passwordStrength > 50 ? 'bg-green-500' : 'bg-red-400'}`} style={{ width: `${passwordStrength}%` }} />
                          </div>

                          <Button
                            type="submit"
                            disabled={registerMutation.isPending}
                            className="w-full h-14 rounded-xl bg-zinc-900 hover:bg-black text-white font-bold text-xl shadow-md transition-all mt-4"
                          >
                            {registerMutation.isPending ? <Loader2 className="animate-spin" /> : "إنشاء حساب"}
                          </Button>
                        </form>
                      </TabsContent>
                    </Tabs>

                    {/* --- Unified Google Auth --- */}
                    <div className="mt-8 space-y-6">
                      <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-gray-100"></div>
                        <span className="flex-shrink mx-4 text-gray-300 font-bold text-xs uppercase tracking-widest">أو عبر</span>
                        <div className="flex-grow border-t border-gray-100"></div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        disabled={loginWithGoogleMutation.isPending}
                        onClick={() => loginWithGoogleMutation.mutate()}
                        className="w-full h-16 rounded-2xl bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-zinc-700 font-bold text-lg shadow-sm transition-all flex items-center justify-center gap-4 group"
                      >
                        {loginWithGoogleMutation.isPending ? (
                          <Loader2 className="animate-spin w-6 h-6" />
                        ) : (
                          <>
                            <svg className="w-6 h-6 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                              <path
                                fill="currentColor"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                style={{ fill: "#4285F4" }}
                              />
                              <path
                                fill="currentColor"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                style={{ fill: "#34A853" }}
                              />
                              <path
                                fill="currentColor"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                                style={{ fill: "#FBBC05" }}
                              />
                              <path
                                fill="currentColor"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                style={{ fill: "#EA4335" }}
                              />
                            </svg>
                            <span>متابعة باستخدام جوجل</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}

                {step === "selection" && (
                  <motion.div
                    key="selection"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-4 py-4"
                  >
                    <button
                      onClick={() => handleMethodSelect("gmail")}
                      className="w-full group bg-white border border-gray-100 hover:border-red-200 p-6 rounded-3xl shadow-sm hover:shadow-xl transition-all flex items-center gap-6"
                    >
                      <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-colors duration-300">
                        <Mail className="w-8 h-8" />
                      </div>
                      <div className="text-right flex-1">
                        <h3 className="font-bold text-gray-900 text-xl">عبر البريد</h3>
                        <p className="text-gray-400 text-sm mt-1">Gmail Verification</p>
                      </div>
                      <ArrowRight className="w-6 h-6 text-gray-300 group-hover:text-red-500 rotate-180 transition-colors" />
                    </button>

                    <button
                      onClick={() => handleMethodSelect("telegram")}
                      className="w-full group bg-white border border-gray-100 hover:border-blue-200 p-6 rounded-3xl shadow-sm hover:shadow-xl transition-all flex items-center gap-6"
                    >
                      <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                        <MessageSquare className="w-8 h-8" />
                      </div>
                      <div className="text-right flex-1">
                        <h3 className="font-bold text-gray-900 text-xl">عبر تيليجرام</h3>
                        <p className="text-gray-400 text-sm mt-1">Telegram Bot</p>
                      </div>
                      <ArrowRight className="w-6 h-6 text-gray-300 group-hover:text-blue-500 rotate-180 transition-colors" />
                    </button>

                    <Button variant="ghost" className="w-full mt-6 text-gray-400 hover:text-gray-900 font-bold" onClick={() => setStep("form")}>رجوع</Button>
                  </motion.div>
                )}

                {step === "otp" && (
                  <motion.div
                    key="otp"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="py-8 text-center"
                  >
                    {otpMethod === "telegram" ? (
                      <div className="space-y-8">
                        <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
                          <Send className="w-12 h-12" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-gray-900">افتح تيليجرام</h3>
                          <p className="text-gray-500 text-base mt-2">التفعيل يتم تلقائياً عند بدء المحادثة</p>
                        </div>
                        {telegramLink && (
                          <a href={telegramLink} target="_blank" rel="noreferrer" className="block w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xl shadow-xl shadow-blue-600/20 transition-all hover:scale-[1.02]">
                            فتح التطبيق
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-10">
                        <div className="flex justify-center gap-3" dir="ltr">
                          {[0, 1, 2, 3, 4, 5].map((i) => (
                            <Input
                              key={i}
                              className="w-14 h-16 text-center text-3xl font-black bg-gray-50 border-gray-200 focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/20 rounded-2xl transition-all p-0 shadow-inner"
                              maxLength={1}
                              value={otpValue[i] || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (/^\d*$/.test(val)) {
                                  const newOtp = otpValue.split("");
                                  newOtp[i] = val.slice(-1);
                                  setOtpValue(newOtp.join(""));
                                  if (val && i < 5) {
                                    const next = e.target.nextElementSibling as HTMLInputElement;
                                    if (next) next.focus();
                                  }
                                }
                              }}
                            />
                          ))}
                        </div>
                        <Button onClick={verifyOtp} disabled={otpValue.length !== 6 || verifyOtpMutation.isPending} className="w-full h-16 bg-[#B91C1C] hover:bg-[#991B1B] text-white font-black text-2xl rounded-2xl shadow-xl shadow-red-900/20 transition-all active:scale-[0.98]">
                          تأكيد الرمز
                        </Button>
                      </div>
                    )}
                  </motion.div>
                )}

                {step === "onboarding" && (
                  <motion.div
                    key="onboarding"
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="py-6 space-y-10"
                    dir="rtl"
                  >
                    {/* Welcome Header with Profile Backdrop */}
                    <div className="flex flex-col items-center relative">
                      <div className="absolute top-0 w-full h-32 bg-gradient-to-b from-primary/5 to-transparent rounded-t-[3rem] -z-10" />

                      <div className="relative group mt-2">
                        <div className="w-32 h-32 rounded-3xl bg-white p-2 shadow-2xl border border-primary/10 overflow-hidden transform group-hover:rotate-3 transition-transform duration-500">
                          <img
                            src={user?.avatarUrl || "/logo.png"}
                            alt="Profile"
                            className="w-full h-full object-cover rounded-2xl"
                          />
                        </div>
                        <div className="absolute -bottom-3 -right-3 bg-[#B91C1C] text-white p-2.5 rounded-2xl shadow-lg border-4 border-white animate-bounce-slow">
                          <Star className="w-5 h-5 fill-current" />
                        </div>
                      </div>

                      <div className="text-center mt-8">
                        <h3 className="text-3xl font-black text-zinc-900 tracking-tight">أهلاً بك في عائلة المراح!</h3>
                        <p className="text-gray-500 font-bold mt-2 text-base">بقي خطوة واحدة لنبدأ رحلتنا معاً</p>
                      </div>
                    </div>

                    {/* Unified Form Container */}
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <Label className="text-zinc-600 font-black text-sm mr-2 flex items-center gap-2">
                          <UserCircle className="w-4 h-4 text-primary" />
                          الاسم الذي تفضله
                        </Label>
                        <Input
                          value={registerForm.getValues("username") || user?.username || ""}
                          onChange={(e) => {
                            registerForm.setValue("username", e.target.value);
                            setOtpValue(""); // Dummy trigger for re-render if needed
                          }}
                          className="h-16 bg-gray-50/50 border-gray-100 rounded-2xl focus:border-red-500/30 focus:ring-4 focus:ring-red-500/5 transition-all font-black text-xl px-6 shadow-inner"
                          placeholder="مثال: صالح العتيبي"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label className="text-zinc-600 font-black text-sm mr-2 flex items-center gap-2">
                          <Phone className="w-4 h-4 text-primary" />
                          رقم جوالك للتواصل
                        </Label>
                        <div className="flex gap-3" dir="ltr">
                          <CountrySelect value={countryCode} onChange={setCountryCode} />
                          <Input
                            value={registerForm.getValues("phone") || ""}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 13);
                              registerForm.setValue("phone", value);
                            }}
                            type="tel"
                            maxLength={13}
                            placeholder="5xxxxxxxx"
                            className="h-16 bg-gray-50/50 border-gray-100 rounded-2xl focus:border-red-500/30 focus:ring-4 focus:ring-red-500/5 flex-1 font-black text-xl transition-all px-6 shadow-inner"
                          />
                        </div>
                        <div className="bg-amber-50/50 p-3 rounded-2xl border border-amber-100/50 flex items-start gap-2 mt-2">
                          <ShieldCheck className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                          <p className="text-[11px] text-amber-800 font-bold leading-relaxed">رقم الجوال ضروري جداً لمتابعة طلبك وتأكيد العنوان وقت التوصيل.</p>
                        </div>
                      </div>

                      <div className="pt-4">
                        <Button
                          onClick={() => {
                            const username = registerForm.getValues("username") || user?.username || "عضو المراح";
                            const rawPhone = registerForm.getValues("phone");

                            if (!rawPhone || rawPhone.length < 9) {
                              toast({ title: "عذراً.. نحتاج لرقم جوالك لخدمتك", variant: "destructive", description: "يرجى إدخال 9 أرقام على الأقل" });
                              return;
                            }

                            const fullPhone = countryCode.replace('+', '') + (rawPhone.startsWith('0') ? rawPhone.substring(1) : rawPhone);

                            completeProfileMutation.mutate({
                              username,
                              phone: fullPhone,
                              avatarUrl: user?.avatarUrl || null
                            }, {
                              onSuccess: () => {
                                toast({ title: "تم تفعيل الحساب بنجاح", description: `مرحباً بك ${username}` });
                                setLocation("/");
                              }
                            });
                          }}
                          disabled={completeProfileMutation.isPending}
                          className="w-full h-18 py-8 rounded-[2rem] bg-[#B91C1C] hover:bg-[#991B1B] text-white font-black text-2xl shadow-[0_15px_40px_-10px_rgba(185,28,28,0.4)] hover:shadow-[0_25px_50px_-10px_rgba(185,28,28,0.5)] active:scale-[0.97] transition-all duration-500 flex items-center justify-center gap-3 mt-4"
                        >
                          {completeProfileMutation.isPending ? (
                            <Loader2 className="animate-spin w-8 h-8" />
                          ) : (
                            <>
                              ابـدأ الآن
                              <ArrowRight className="w-6 h-6 rotate-180" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* Mobile-Only Simple Footer */}
        <motion.div
          className="lg:hidden text-center mt-12 mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-gray-300 text-sm font-medium">أفضل تجربة شرائية للحوم الطازجة</p>
        </motion.div>

      </div>
    </div>
  );
}

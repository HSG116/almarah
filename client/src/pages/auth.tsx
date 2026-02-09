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
import { Loader2, ShieldCheck, Mail, Send, CheckCircle2, ArrowRight, MessageSquare } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { CountrySelect } from "@/components/ui/country-select";

type AuthStep = "form" | "selection" | "otp";

export default function Auth() {
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation, verifyOtpMutation } = useAuth();
  const [step, setStep] = useState<AuthStep>("form");
  const [otpMethod, setOtpMethod] = useState<"gmail" | "telegram" | null>(null);
  const [otpValue, setOtpValue] = useState("");
  const { toast } = useToast();

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
    if (s <= 50) return "bg-orange-500";
    if (s <= 75) return "bg-yellow-500";
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

  return (
    <div className="min-h-screen w-full flex bg-background font-sans overflow-hidden relative">
      {/* Dynamic Background for Mobile */}
      <div className="absolute inset-0 lg:hidden z-0">
        <div className="absolute inset-0 bg-black/60 z-10" />
        <img
          src="/images/auth-bg-mobile.jpg"
          onError={(e) => (e.currentTarget.src = "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?q=80&w=2070&auto=format&fit=crop")}
          alt="Background"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Desktop Image Section */}
      <motion.div
        className="hidden lg:flex w-1/2 relative bg-black items-center justify-center overflow-hidden"
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />
        <motion.img
          src="/images/auth-bg-desktop.jpg"
          onError={(e) => (e.currentTarget.src = "https://images.unsplash.com/photo-1558030006-450675393462?q=80&w=1931&auto=format&fit=crop")}
          alt="Premium Meat"
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 10, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
        />
        <div className="relative z-20 text-white text-center p-12 max-w-2xl">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <ShieldCheck className="w-24 h-24 mx-auto mb-8 text-primary drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
            <h1 className="text-6xl font-black mb-6 tracking-tighter font-heading leading-tight">
              طعم الفخامة <br />
              <span className="text-primary">الأصلي</span>
            </h1>
            <p className="text-2xl text-gray-300 font-light leading-relaxed">
              سجل دخولك الآن واستمتع بأجود أنواع اللحوم الطازجة تصلك إلى باب بيتك بعناية فائقة.
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Form Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative z-10">
        <motion.div
          className="w-full max-w-[500px]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-xl lg:bg-white rounded-[2.5rem] overflow-hidden">
            <CardHeader className="text-center pb-2 pt-10 px-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center"
                >
                  {step === "form" && (
                    <>
                      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 lg:hidden">
                        <ShieldCheck className="h-8 w-8 text-primary" />
                      </div>
                      <CardTitle className="text-3xl lg:text-4xl font-black text-gray-900 font-heading mb-2">مرحباً بك 👋</CardTitle>
                      <CardDescription className="text-base font-medium">سجل دخولك للمتابعة</CardDescription>
                    </>
                  )}
                  {step === "selection" && (
                    <>
                      <CardTitle className="text-3xl font-black text-gray-900 font-heading mb-2">تفعيل الحساب</CardTitle>
                      <CardDescription className="text-base font-medium">أختر وسيلة التحقق المناسبة</CardDescription>
                    </>
                  )}
                  {step === "otp" && (
                    <>
                      <CardTitle className="text-3xl font-black text-gray-900 font-heading mb-2">تأكيد الرمز</CardTitle>
                      <CardDescription className="text-base font-medium">أدخل رمز التحقق المرسل إليك</CardDescription>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </CardHeader>

            <CardContent className="p-8 lg:p-10">
              <AnimatePresence mode="wait">
                {step === "form" && (
                  <motion.div
                    key="step-form"
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                  >
                    <Tabs defaultValue="login" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 mb-8 bg-gray-100/80 p-1.5 rounded-2xl h-auto">
                        <TabsTrigger
                          value="login"
                          className="rounded-xl py-3 font-bold text-base data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md transition-all"
                        >
                          تسجيل دخول
                        </TabsTrigger>
                        <TabsTrigger
                          value="register"
                          className="rounded-xl py-3 font-bold text-base data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md transition-all"
                        >
                          حساب جديد
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="login">
                        <form
                          onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))}
                          className="space-y-6"
                        >
                          <div className="space-y-2">
                            <Label htmlFor="login-email" className="text-sm font-bold text-gray-700">البريد الإلكتروني</Label>
                            <Input
                              id="login-email"
                              placeholder="mail@example.com"
                              className="h-14 bg-gray-50 border-gray-200 focus:bg-white focus:border-primary/50 focus:ring-4 focus:ring-primary/10 rounded-2xl transition-all text-left text-lg px-6"
                              dir="ltr"
                              {...loginForm.register("email")}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <Label htmlFor="password" className="text-sm font-bold text-gray-700">كلمة المرور</Label>
                              <Button variant="link" className="p-0 h-auto text-xs font-bold text-primary hover:text-primary/80" type="button">نسيت كلمة المرور؟</Button>
                            </div>
                            <Input
                              id="password"
                              type="password"
                              placeholder="••••••••"
                              className="h-14 bg-gray-50 border-gray-200 focus:bg-white focus:border-primary/50 focus:ring-4 focus:ring-primary/10 rounded-2xl transition-all text-lg px-6"
                              {...loginForm.register("password")}
                              required
                            />
                          </div>
                          <Button
                            type="submit"
                            className="w-full font-black text-lg h-14 rounded-2xl shadow-xl shadow-primary/25 bg-primary hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 mt-4"
                            disabled={loginMutation.isPending}
                          >
                            {loginMutation.isPending ? (
                              <Loader2 className="ml-2 h-6 w-6 animate-spin" />
                            ) : (
                              <div className="flex items-center gap-2">
                                <span>دخول آمن</span>
                                <ArrowRight className="h-5 w-5 rotate-180" />
                              </div>
                            )}
                          </Button>
                        </form>
                      </TabsContent>

                      <TabsContent value="register">
                        <form
                          onSubmit={registerForm.handleSubmit(handleRegisterSubmit)}
                          className="space-y-5"
                        >
                          <div className="space-y-1.5">
                            <Label className="text-sm font-bold text-gray-700">اسم المستخدم</Label>
                            <Input
                              placeholder="username"
                              className="h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-primary/50 rounded-xl px-4"
                              dir="ltr"
                              {...registerForm.register("username")}
                              required
                            />
                            {registerForm.formState.errors.username && (
                              <p className="text-xs text-red-500 font-bold">{registerForm.formState.errors.username.message}</p>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-sm font-bold text-gray-700">البريد الإلكتروني</Label>
                            <Input type="email" placeholder="mail@example.com" className="h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-primary/50 rounded-xl px-4" dir="ltr" {...registerForm.register("email")} required />
                            {registerForm.formState.errors.email && <p className="text-xs text-red-500 font-bold">{registerForm.formState.errors.email.message}</p>}
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-sm font-bold text-gray-700">رقم الجوال</Label>
                            <div className="flex gap-2" dir="ltr">
                              <CountrySelect
                                value={countryCode}
                                onChange={setCountryCode}
                              />
                              <Input
                                type="tel"
                                placeholder="5xxxxxxxx"
                                className="h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-primary/50 rounded-xl flex-1 text-lg font-bold px-4"
                                {...registerForm.register("phone")}
                                required
                              />
                            </div>
                            {registerForm.formState.errors.phone && <p className="text-xs text-red-500 font-bold">{registerForm.formState.errors.phone.message}</p>}
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-sm font-bold text-gray-700">كلمة المرور</Label>
                              <Input type="password" className="h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-primary/50 rounded-xl px-4" {...registerForm.register("password")} required />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-sm font-bold text-gray-700">تأكيد الكلمة</Label>
                              <Input type="password" className="h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-primary/50 rounded-xl px-4" {...registerForm.register("confirmPassword")} required />
                            </div>
                          </div>

                          {/* Password Strength Meter */}
                          <div className="space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <div className="flex justify-between text-xs font-bold mb-1">
                              <span className="text-gray-500">قوة كلمة المرور</span>
                              <span className={`${getStrengthColor(passwordStrength).replace('bg-', 'text-')} transition-colors duration-300`}>
                                {getStrengthText(passwordStrength)}
                              </span>
                            </div>
                            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                              <motion.div
                                className={`h-full ${getStrengthColor(passwordStrength)}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${passwordStrength}%` }}
                                transition={{ duration: 0.5 }}
                              />
                            </div>
                          </div>

                          <Button
                            type="submit"
                            className="w-full font-black text-lg h-14 rounded-2xl shadow-xl shadow-primary/25 bg-primary hover:bg-primary/90 mt-4 hover:scale-[1.02] active:scale-[0.98] transition-all"
                            disabled={registerMutation.isPending}
                          >
                            إنشاء الحساب
                          </Button>
                        </form>
                      </TabsContent>
                    </Tabs>
                  </motion.div>
                )}

                {step === "selection" && (
                  <motion.div
                    key="step-selection"
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                    className="space-y-4"
                  >
                    {[
                      { id: "gmail", icon: Mail, label: "عبر البريد الإلكتروني (Gmail)", color: "text-red-500", bg: "bg-red-50 border-red-100 hover:border-red-300" },
                      { id: "telegram", icon: MessageSquare, label: "عبر تيليجرام (Telegram)", color: "text-blue-500", bg: "bg-blue-50 border-blue-100 hover:border-blue-300" }
                    ].map((method) => (
                      <button
                        key={method.id}
                        onClick={() => handleMethodSelect(method.id as any)}
                        disabled={registerMutation.isPending}
                        className={`w-full flex items-center p-6 gap-4 rounded-3xl border-2 transition-all duration-300 hover:shadow-lg group text-right ${method.bg}`}
                      >
                        <div className={`w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm ${method.color}`}>
                          <method.icon className="w-7 h-7" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-lg text-gray-900 mb-1">{method.label}</h4>
                          <p className="text-xs text-gray-500 font-medium opacity-80">رمز تحقق سريع وآمن</p>
                        </div>
                        <div className="w-8 h-8 rounded-full border-2 border-gray-300 group-hover:border-primary group-hover:bg-primary transition-all flex items-center justify-center">
                          <ArrowRight className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity rotate-180" />
                        </div>
                      </button>
                    ))}

                    <Button variant="ghost" className="w-full font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl h-12 mt-4" onClick={() => setStep("form")}>
                      الرجوع للخلف
                    </Button>
                  </motion.div>
                )}

                {step === "otp" && (
                  <motion.div
                    key="step-otp"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-8 py-4"
                  >
                    {otpMethod === 'telegram' ? (
                      <div className="space-y-6">
                        <div className="relative overflow-hidden p-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl text-center text-white shadow-xl shadow-blue-500/30">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                          <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

                          <div className="relative z-10 flex flex-col items-center">
                            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
                              <Send className="h-10 w-10 text-white" />
                            </div>
                            <h3 className="font-black text-2xl mb-2">تأكيد تيليجرام</h3>
                            <p className="text-blue-100 text-sm mb-6 max-w-[200px] leading-relaxed opacity-90">
                              اضغط بالأسفل للانتقال للمحادثة وشارك رقمك ليتم التفعيل فوراً
                            </p>

                            {telegramLink ? (
                              <a
                                href={telegramLink}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full py-4 bg-white text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-colors shadow-lg flex items-center justify-center gap-2 group"
                              >
                                <span>فتح تيليجرام</span>
                                <Send className="h-4 w-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
                              </a>
                            ) : (
                              <div className="w-full py-4 bg-white/20 rounded-xl animate-pulse">جاري التحضير...</div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 animate-pulse font-medium bg-gray-50 py-3 rounded-full">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>بانتظار التأكيد من التطبيق...</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        <div className="flex justify-center gap-3" dir="ltr">
                          {[0, 1, 2, 3, 4, 5].map((i) => (
                            <motion.div
                              key={i}
                              initial={{ y: 20, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: i * 0.1 }}
                            >
                              <Input
                                className="h-14 w-12 sm:h-16 sm:w-14 text-center text-3xl font-black rounded-2xl border-2 border-gray-100 bg-gray-50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all p-0 shadow-sm"
                                maxLength={1}
                                value={otpValue[i] || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (/^\d*$/.test(val)) {
                                    const newOtp = otpValue.split("");
                                    newOtp[i] = val.slice(-1);
                                    setOtpValue(newOtp.join(""));
                                    if (val && i < 5) {
                                      const next = e.target.parentElement?.nextElementSibling?.querySelector('input') as HTMLInputElement;
                                      if (next) next.focus();
                                    }
                                  }
                                }}
                              />
                            </motion.div>
                          ))}
                        </div>

                        <Button
                          className="w-full h-14 text-lg font-black rounded-2xl shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 transition-all hover:scale-[1.02]"
                          disabled={otpValue.length !== 6 || verifyOtpMutation.isPending}
                          onClick={verifyOtp}
                        >
                          {verifyOtpMutation.isPending ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="ml-2 h-6 w-6" />
                              تأكيد الرمز
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    <Button variant="ghost" className="w-full font-bold text-gray-400 hover:text-gray-900" onClick={() => setStep("selection")}>
                      تغيير طريقة الاستلام
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

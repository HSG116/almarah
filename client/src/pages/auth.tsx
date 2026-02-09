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

  // Ultra-Modern "Luxury Dark/Gold" Theme with 3D Tilt & Glassmorphism
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950 font-sans overflow-hidden relative selection:bg-primary/30 text-white">
      <Navbar />

      {/* --- Dynamic Background Atmosphere --- */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,100,0,0.15),transparent_70%)] animate-pulse-slow" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]" />

        {/* Animated Orbs */}
        <motion.div
          animate={{ x: [0, 100, 0], y: [0, -50, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{ x: [0, -100, 0], y: [0, 50, 0], scale: [1, 1.5, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[150px]"
        />
      </div>

      {/* --- Main Content Container (Glass Card with 3D Tilt Effect) --- */}
      <div className="relative z-10 w-full max-w-5xl flex flex-col lg:flex-row items-center justify-center p-4 lg:p-0 gap-8 lg:gap-20">

        {/* Left Side: Brand & Hero (Hidden on Mobile, Visible on Desktop) */}
        <motion.div
          className="hidden lg:flex flex-col items-start max-w-lg text-left"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-green-300 rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(34,197,94,0.4)] mb-8 transform rotate-3 hover:rotate-6 transition-all duration-500">
            <ShieldCheck className="w-10 h-10 text-zinc-950" />
          </div>
          <h1 className="text-7xl font-black tracking-tighter leading-[0.9] mb-6 font-heading bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-500">
            مستوى آخر <br /> من الجودة.
          </h1>
          <p className="text-xl text-gray-400 font-medium leading-relaxed max-w-md">
            انضم الآن لنخبة الذواقة. أجود أنواع اللحوم الطازجة والذبائح المختارة بعناية فائقة، تصلك أينما كنت.
          </p>

          <div className="mt-10 flex items-center gap-4">
            <div className="flex -space-x-4 space-x-reverse">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-12 h-12 rounded-full border-2 border-zinc-950 bg-zinc-800 overflow-hidden">
                  <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="User" />
                </div>
              ))}
            </div>
            <div className="text-sm font-bold text-gray-400">
              <span className="text-white text-lg block font-black">+5,000</span>
              عميل سعيد يثق بنا
            </div>
          </div>
        </motion.div>

        {/* Right Side: Interavtive Form Card */}
        <motion.div
          className="w-full max-w-[480px] perspective-1000"
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
        >
          <div className="relative bg-zinc-900/60 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-8 lg:p-10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden group hover:border-white/20 transition-all duration-500">
            {/* Glossy Reflection Effect */}
            <div className="absolute -inset-[100%] bg-gradient-to-r from-transparent via-white/5 to-transparent rotate-45 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

            <div className="relative z-10">
              {/* Header */}
              <div className="text-center mb-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <h2 className="text-3xl font-black text-white mb-2 font-heading tracking-tight">{
                      step === 'form' ? 'مرحباً بعودتك' :
                        step === 'selection' ? 'تفعيل الحساب' : 'التحقق الأمني'
                    }</h2>
                    <p className="text-gray-400 font-medium text-sm">{
                      step === 'form' ? 'سجل دخولك للمتابعة أو أنشئ حساباً جديداً' :
                        step === 'selection' ? 'اختر الطريقة الأنسب لك لاستلام الرمز' : 'أدخل الرمز المرسل لإكمال العملية'
                    }</p>
                  </motion.div>
                </AnimatePresence>
              </div>

              <AnimatePresence mode="wait">
                {step === "form" && (
                  <motion.div
                    key="form"
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -50, opacity: 0 }}
                  >
                    <Tabs defaultValue="login" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 mb-8 bg-black/40 p-1.5 rounded-2xl h-16 border border-white/5">
                        <TabsTrigger
                          value="login"
                          className="rounded-xl h-full font-bold text-base data-[state=active]:bg-zinc-800 data-[state=active]:text-white data-[state=active]:shadow-lg active:scale-95 transition-all duration-300"
                        >الدخول</TabsTrigger>
                        <TabsTrigger
                          value="register"
                          className="rounded-xl h-full font-bold text-base data-[state=active]:bg-zinc-800 data-[state=active]:text-white data-[state=active]:shadow-lg active:scale-95 transition-all duration-300"
                        >جديد</TabsTrigger>
                      </TabsList>

                      <TabsContent value="login" className="mt-0">
                        <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-5">
                          <div className="space-y-2 group">
                            <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider group-focus-within:text-primary transition-colors">البريد الإلكتروني</Label>
                            <Input
                              {...loginForm.register("email")}
                              dir="ltr"
                              className="h-14 bg-black/20 border-white/10 text-white placeholder:text-gray-600 rounded-2xl focus:border-primary/50 focus:ring-primary/20 focus:bg-black/40 transition-all text-lg px-5"
                              placeholder="name@example.com"
                            />
                          </div>
                          <div className="space-y-2 group">
                            <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider group-focus-within:text-primary transition-colors">كلمة المرور</Label>
                            <Input
                              type="password"
                              {...loginForm.register("password")}
                              className="h-14 bg-black/20 border-white/10 text-white placeholder:text-gray-600 rounded-2xl focus:border-primary/50 focus:ring-primary/20 focus:bg-black/40 transition-all text-lg px-5 tracking-widest"
                              placeholder="••••••••"
                            />
                          </div>

                          <Button
                            type="submit"
                            disabled={loginMutation.isPending}
                            className="w-full h-16 rounded-2xl bg-gradient-to-r from-primary to-green-600 hover:from-green-500 hover:to-primary text-black font-black text-xl shadow-[0_0_30px_rgba(34,197,94,0.3)] hover:shadow-[0_0_50px_rgba(34,197,94,0.5)] transition-all duration-300 transform hover:-translate-y-1 active:scale-95 mt-4"
                          >
                            {loginMutation.isPending ? <Loader2 className="animate-spin w-6 h-6" /> : "دخول الآن"}
                          </Button>
                        </form>
                      </TabsContent>

                      <TabsContent value="register" className="mt-0 space-y-4">
                        <form onSubmit={registerForm.handleSubmit(handleRegisterSubmit)} className="space-y-4">
                          <div className="grid grid-cols-1 gap-4">
                            <Input
                              {...registerForm.register("username")}
                              dir="ltr"
                              placeholder="Username"
                              className="h-12 bg-black/20 border-white/10 text-white rounded-xl focus:border-primary/50"
                            />
                            <Input
                              {...registerForm.register("email")}
                              type="email"
                              dir="ltr"
                              placeholder="Email Address"
                              className="h-12 bg-black/20 border-white/10 text-white rounded-xl focus:border-primary/50"
                            />
                            <div className="flex gap-2" dir="ltr">
                              <CountrySelect value={countryCode} onChange={setCountryCode} />
                              <Input
                                {...registerForm.register("phone")}
                                type="tel"
                                placeholder="5xxxxxxxx"
                                className="h-12 bg-black/20 border-white/10 text-white rounded-xl focus:border-primary/50 text-lg font-bold flex-1"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <Input type="password" {...registerForm.register("password")} placeholder="Password" className="h-12 bg-black/20 border-white/10 text-white rounded-xl" />
                              <Input type="password" {...registerForm.register("confirmPassword")} placeholder="Confirm" className="h-12 bg-black/20 border-white/10 text-white rounded-xl" />
                            </div>
                          </div>

                          <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${getStrengthColor(passwordStrength)}`} style={{ width: `${passwordStrength}%` }} />
                          </div>

                          <Button
                            type="submit"
                            disabled={registerMutation.isPending}
                            className="w-full h-14 rounded-2xl bg-white text-black hover:bg-gray-200 font-bold text-lg shadow-lg transition-all mt-2"
                          >
                            {registerMutation.isPending ? <Loader2 className="animate-spin" /> : "متابعة"}
                          </Button>
                        </form>
                      </TabsContent>
                    </Tabs>
                  </motion.div>
                )}

                {step === "selection" && (
                  <motion.div
                    key="selection"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.2, opacity: 0 }}
                    className="space-y-4 py-4"
                  >
                    <button
                      onClick={() => handleMethodSelect("gmail")}
                      className="w-full group relative overflow-hidden bg-gradient-to-br from-red-500/10 to-red-600/5 hover:from-red-500/20 hover:to-red-600/10 border border-red-500/20 hover:border-red-500/50 p-6 rounded-3xl transition-all duration-300 flex items-center gap-6"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Mail className="w-8 h-8 text-red-500" />
                      </div>
                      <div className="text-right flex-1">
                        <h3 className="text-xl font-bold text-white mb-1">عبر الإيميل</h3>
                        <p className="text-red-200/50 text-xs">رمز يصلك لبريدك الجيميل</p>
                      </div>
                      <ArrowRight className="w-6 h-6 text-white/20 group-hover:text-white group-hover:-translate-x-2 transition-all rotate-180" />
                    </button>

                    <button
                      onClick={() => handleMethodSelect("telegram")}
                      className="w-full group relative overflow-hidden bg-gradient-to-br from-blue-500/10 to-blue-600/5 hover:from-blue-500/20 hover:to-blue-600/10 border border-blue-500/20 hover:border-blue-500/50 p-6 rounded-3xl transition-all duration-300 flex items-center gap-6"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <MessageSquare className="w-8 h-8 text-blue-500" />
                      </div>
                      <div className="text-right flex-1">
                        <h3 className="text-xl font-bold text-white mb-1">عبر تيليجرام</h3>
                        <p className="text-blue-200/50 text-xs">أسرع وسيلة، تفعيل فوري</p>
                      </div>
                      <ArrowRight className="w-6 h-6 text-white/20 group-hover:text-white group-hover:-translate-x-2 transition-all rotate-180" />
                    </button>

                    <button onClick={() => setStep("form")} className="w-full py-4 text-gray-500 font-bold hover:text-white transition-colors">
                      تراجع
                    </button>
                  </motion.div>
                )}

                {step === "otp" && (
                  <motion.div
                    key="otp"
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -50, opacity: 0 }}
                    className="py-10 text-center"
                  >
                    {otpMethod === "telegram" ? (
                      <div className="space-y-8">
                        <motion.div
                          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                          transition={{ duration: 4, repeat: Infinity }}
                          className="w-24 h-24 mx-auto bg-blue-500 rounded-[2.5rem] flex items-center justify-center shadow-[0_0_50px_rgba(59,130,246,0.5)]"
                        >
                          <Send className="w-12 h-12 text-white" />
                        </motion.div>

                        <div>
                          <h3 className="text-2xl font-bold text-white mb-2">افتح تيليجرام الآن</h3>
                          <p className="text-gray-400">بانتظار تأكيدك... العملية تتم تلقائياً</p>
                        </div>

                        {telegramLink && (
                          <a href={telegramLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 rounded-2xl font-black text-lg hover:bg-blue-50 transition-colors">
                            اضغط هنا للفتح
                            <Send className="w-5 h-5 rotate-180" />
                          </a>
                        )}

                        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 animate-pulse">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          جاري التحقق...
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        <div className="flex justify-center gap-3" dir="ltr">
                          {[0, 1, 2, 3, 4, 5].map((i) => (
                            <motion.input
                              key={i}
                              initial={{ y: 20, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: i * 0.1 }}
                              className="w-14 h-16 bg-black/30 border border-white/10 rounded-2xl text-center text-3xl font-black text-white focus:border-primary focus:bg-primary/10 transition-all outline-none"
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
                        <Button
                          onClick={verifyOtp}
                          disabled={otpValue.length !== 6 || verifyOtpMutation.isPending}
                          className="w-full h-16 rounded-2xl bg-primary hover:bg-green-400 text-black font-black text-xl shadow-[0_0_30px_rgba(34,197,94,0.3)] transition-all"
                        >
                          {verifyOtpMutation.isPending ? <Loader2 className="animate-spin" /> : "تأكيد الرمز"}
                        </Button>
                      </div>
                    )}
                    <button onClick={() => setStep("selection")} className="mt-8 text-gray-500 hover:text-white transition-colors font-medium">
                      تغيير الطريقة
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

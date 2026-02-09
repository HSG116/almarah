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

  // Strong "Brand Red" Theme (Clean, Modern, Powerful)
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#FAFAFA] font-sans overflow-hidden relative selection:bg-red-500/30 text-zinc-900">
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

      <div className="relative z-10 w-full max-w-7xl flex flex-col lg:flex-row items-center justify-center p-4 px-4 lg:px-20 gap-8 lg:gap-32">

        {/* Mobile Header Logo (Visible only on mobile) - MOVED OUTSIDE CARD TO BE FIRST ELEMENT */}
        <div className="lg:hidden flex flex-col items-center gap-2 mb-2 w-full">
          <div className="w-16 h-16 bg-gradient-to-br from-red-50 to-white rounded-2xl flex items-center justify-center shadow-lg shadow-red-900/5 border border-red-100">
            <ShieldCheck className="w-8 h-8 text-[#B91C1C]" />
          </div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">الـمـلـحـمـة</h1>
          <p className="text-xs font-bold text-gray-400">جودة تستحق الثقة</p>
        </div>

        {/* Hero Section (Hidden on Mobile, Visible on Desktop) - NOW FIRST IN FLEX ROW (Left in LTR) logic, but visually depends on direction */}
        <motion.div
          className="hidden lg:flex flex-col items-center lg:items-end text-right max-w-xl"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="relative mb-8">
            <div className="absolute -inset-10 bg-red-500/10 rounded-full blur-[60px]" />
            <ShieldCheck className="w-48 h-48 text-[#B91C1C] relative z-10 drop-shadow-2xl" />
          </div>

          <h1 className="text-7xl font-black text-zinc-900 leading-[1.1]">
            الطعم <br /> <span className="text-transparent bg-clip-text bg-gradient-to-l from-[#B91C1C] to-red-600">الأصيل.</span>
          </h1>
          <p className="text-xl text-gray-500 mt-6 font-medium leading-relaxed max-w-lg">
            نقدم لك أفضل تجربة شرائية للحوم الطازجة. جودة تليق بك وبأحبابك، وتوصيل سريع ومضمون.
          </p>

          <div className="mt-10 flex gap-4">
            <div className="px-6 py-4 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 hover:shadow-md transition-shadow">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <span className="font-bold text-gray-700">توصيل اليوم</span>
            </div>
            <div className="px-6 py-4 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 hover:shadow-md transition-shadow">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="font-bold text-gray-700">ذبح يومي</span>
            </div>
          </div>
        </motion.div>

        {/* Interactive Form Card (Glass - White) */}
        <motion.div
          className="w-full max-w-[450px]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, type: "spring" }}
        >
          <div className="bg-white/90 backdrop-blur-2xl border border-white/50 rounded-[2.5rem] shadow-[0_20px_40px_-15px_rgba(185,28,28,0.08)] p-6 sm:p-8 relative overflow-hidden ring-1 ring-black/5">

            {/* Header */}
            <div className="text-center mb-6 lg:mb-8">
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
                    <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-50/80 p-1.5 rounded-2xl h-14 border border-gray-100">
                      <TabsTrigger value="login" className="rounded-xl h-full font-bold text-gray-500 data-[state=active]:bg-white data-[state=active]:text-[#B91C1C] data-[state=active]:shadow-sm transition-all duration-300">تسجيل دخول</TabsTrigger>
                      <TabsTrigger value="register" className="rounded-xl h-full font-bold text-gray-500 data-[state=active]:bg-white data-[state=active]:text-[#B91C1C] data-[state=active]:shadow-sm transition-all duration-300">حساب جديد</TabsTrigger>
                    </TabsList>

                    <TabsContent value="login" className="mt-0 space-y-5">
                      <div className="space-y-2">
                        <Label className="text-gray-700 font-bold text-xs uppercase mr-1">البريد الإلكتروني</Label>
                        <Input
                          {...loginForm.register("email")}
                          dir="ltr"
                          className="h-14 bg-white border-gray-200 focus:border-red-500/50 focus:ring-4 focus:ring-red-500/10 rounded-2xl transition-all text-lg px-4 shadow-sm text-zinc-800 placeholder:text-gray-300"
                          placeholder="name@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-700 font-bold text-xs uppercase mr-1">كلمة المرور</Label>
                        <Input
                          type="password"
                          {...loginForm.register("password")}
                          className="h-14 bg-white border-gray-200 focus:border-red-500/50 focus:ring-4 focus:ring-red-500/10 rounded-2xl transition-all text-lg px-4 shadow-sm text-zinc-800 tracking-widest placeholder:text-gray-300"
                          placeholder="••••••••"
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={loginMutation.isPending}
                        className="w-full h-14 rounded-2xl bg-[#B91C1C] hover:bg-[#991B1B] text-white font-black text-xl shadow-lg shadow-red-900/10 active:scale-[0.98] transition-all duration-300 mt-2"
                      >
                        {loginMutation.isPending ? <Loader2 className="animate-spin w-6 h-6" /> : "دخول"}
                      </Button>
                    </TabsContent>

                    <TabsContent value="register" className="mt-0 space-y-4">
                      <form onSubmit={registerForm.handleSubmit(handleRegisterSubmit)} className="space-y-4">
                        <Input {...registerForm.register("username")} dir="ltr" placeholder="اسم المستخدم" className="h-12 bg-white border-gray-200 rounded-xl focus:border-red-500/30 focus:ring-red-500/10 transition-all font-medium" />
                        <Input {...registerForm.register("email")} type="email" dir="ltr" placeholder="البريد الإلكتروني" className="h-12 bg-white border-gray-200 rounded-xl focus:border-red-500/30 focus:ring-red-500/10 transition-all font-medium" />
                        <div className="flex gap-2" dir="ltr">
                          <CountrySelect value={countryCode} onChange={setCountryCode} />
                          <Input {...registerForm.register("phone")} type="tel" placeholder="5xxxxxxxx" className="h-12 bg-white border-gray-200 rounded-xl focus:border-red-500/30 focus:ring-red-500/10 flex-1 font-bold text-lg transition-all" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Input type="password" {...registerForm.register("password")} placeholder="كلمة المرور" className="h-12 bg-white border-gray-200 rounded-xl focus:border-red-500/30 focus:ring-red-500/10 transition-all font-medium" />
                          <Input type="password" {...registerForm.register("confirmPassword")} placeholder="تأكيدها" className="h-12 bg-white border-gray-200 rounded-xl focus:border-red-500/30 focus:ring-red-500/10 transition-all font-medium" />
                        </div>

                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-500 ${passwordStrength > 50 ? 'bg-green-500' : 'bg-red-400'}`} style={{ width: `${passwordStrength}%` }} />
                        </div>

                        <Button
                          type="submit"
                          disabled={registerMutation.isPending}
                          className="w-full h-12 rounded-xl bg-zinc-900 hover:bg-black text-white font-bold text-lg shadow-md transition-all mt-2"
                        >
                          {registerMutation.isPending ? <Loader2 className="animate-spin" /> : "إنشاء حساب"}
                        </Button>
                      </form>
                    </TabsContent>
                  </Tabs>
                </motion.div>
              )}

              {step === "selection" && (
                <motion.div
                  key="selection"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-4 py-2"
                >
                  <button
                    onClick={() => handleMethodSelect("gmail")}
                    className="w-full group bg-white border border-gray-100 hover:border-red-200 p-5 rounded-2xl shadow-sm hover:shadow-lg transition-all flex items-center gap-5"
                  >
                    <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-colors">
                      <Mail className="w-7 h-7" />
                    </div>
                    <div className="text-right flex-1">
                      <h3 className="font-bold text-gray-900 text-lg">عبر البريد</h3>
                      <p className="text-gray-400 text-xs">Gmail Verification</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-red-500 rotate-180 transition-colors" />
                  </button>

                  <button
                    onClick={() => handleMethodSelect("telegram")}
                    className="w-full group bg-white border border-gray-100 hover:border-blue-200 p-5 rounded-2xl shadow-sm hover:shadow-lg transition-all flex items-center gap-5"
                  >
                    <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                      <MessageSquare className="w-7 h-7" />
                    </div>
                    <div className="text-right flex-1">
                      <h3 className="font-bold text-gray-900 text-lg">عبر تيليجرام</h3>
                      <p className="text-gray-400 text-xs">Telegram Bot</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 rotate-180 transition-colors" />
                  </button>

                  <Button variant="ghost" className="w-full mt-4 text-gray-400 hover:text-gray-900" onClick={() => setStep("form")}>رجوع</Button>
                </motion.div>
              )}

              {step === "otp" && (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="py-6 text-center"
                >
                  {otpMethod === "telegram" ? (
                    <div className="space-y-6">
                      <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
                        <Send className="w-10 h-10" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">افتح تيليجرام</h3>
                        <p className="text-gray-500 text-sm">التفعيل يتم تلقائياً عند بدء المحادثة</p>
                      </div>
                      {telegramLink && (
                        <a href={telegramLink} target="_blank" rel="noreferrer" className="block w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all">
                          فتح التطبيق
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className="flex justify-center gap-2" dir="ltr">
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <Input
                            key={i}
                            className="w-12 h-14 text-center text-3xl font-black bg-gray-50 border-gray-200 focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 rounded-xl transition-all p-0"
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
                      <Button onClick={verifyOtp} disabled={otpValue.length !== 6 || verifyOtpMutation.isPending} className="w-full h-14 bg-[#B91C1C] hover:bg-[#991B1B] text-white font-black text-lg rounded-2xl shadow-lg shadow-red-900/20">
                        تأكيد الرمز
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

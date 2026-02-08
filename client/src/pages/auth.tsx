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
    <motion.div
      className="min-h-screen bg-muted/10 flex flex-col"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <Navbar />

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-none shadow-2xl relative overflow-hidden bg-white/80 backdrop-blur-sm">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />

          <CardHeader className="text-center pb-2">
            <AnimatePresence mode="wait">
              {step === "form" && (
                <motion.div
                  key="header-form"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <CardTitle className="text-3xl font-bold font-heading text-primary flex items-center justify-center gap-2">
                    <ShieldCheck className="h-8 w-8" />
                    الملحمة
                  </CardTitle>
                  <CardDescription className="text-base mt-2">انضم إلينا اليوم لتجربة تسوق فريدة</CardDescription>
                </motion.div>
              )}
              {step === "selection" && (
                <motion.div
                  key="header-selection"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <CardTitle className="text-2xl font-bold font-heading text-primary">تفعيل الحساب</CardTitle>
                  <CardDescription className="text-base mt-2">اختر وسيلة استلام رمز التحقق (OTP)</CardDescription>
                </motion.div>
              )}
              {step === "otp" && (
                <motion.div
                  key="header-otp"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <CardTitle className="text-2xl font-bold font-heading text-primary">تأكيد الرمز</CardTitle>
                  <CardDescription className="text-base mt-2">
                    أدخل الرمز المكون من 6 أرقام المرسل إلى {otpMethod === 'gmail' ? 'بريدك الإلكتروني' : 'حسابك في تلجرام'}
                  </CardDescription>
                </motion.div>
              )}
            </AnimatePresence>
          </CardHeader>

          <CardContent className="pt-4">
            <AnimatePresence mode="wait">
              {step === "form" && (
                <motion.div
                  key="step-form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Tabs defaultValue="login" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted/50 p-1 rounded-xl">
                      <TabsTrigger value="login" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all h-10">دخول</TabsTrigger>
                      <TabsTrigger value="register" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all h-10">حساب جديد</TabsTrigger>
                    </TabsList>

                    <TabsContent value="login">
                      <form
                        onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))}
                        className="space-y-5"
                      >
                        <div className="space-y-2">
                          <Label htmlFor="login-email">البريد الإلكتروني</Label>
                          <Input
                            id="login-email"
                            placeholder="mail@example.com"
                            className="h-12 bg-white/50 focus:bg-white transition-all text-left"
                            dir="ltr"
                            {...loginForm.register("email")}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password">كلمة المرور</Label>
                          <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            className="h-12 bg-white/50 focus:bg-white transition-all"
                            {...loginForm.register("password")}
                          />
                        </div>
                        <Button
                          type="submit"
                          className="w-full font-bold shadow-lg shadow-primary/20 h-12 text-lg mt-2 group"
                          disabled={loginMutation.isPending}
                        >
                          {loginMutation.isPending ? (
                            <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                          ) : (
                            <Send className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                          )}
                          تسجيل الدخول
                        </Button>
                      </form>
                    </TabsContent>

                    <TabsContent value="register">
                      <form
                        onSubmit={registerForm.handleSubmit(handleRegisterSubmit)}
                        className="space-y-4"
                      >
                        <div className="space-y-1.5">
                          <Label htmlFor="reg-username">اسم المستخدم</Label>
                          <Input
                            id="reg-username"
                            placeholder="username"
                            className="h-11 bg-white/50"
                            dir="ltr"
                            {...registerForm.register("username")}
                          />
                          {registerForm.formState.errors.username && (
                            <p className="text-xs text-destructive">{registerForm.formState.errors.username.message}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="reg-email">البريد الإلكتروني</Label>
                            <Input id="reg-email" type="email" placeholder="mail@example.com" className="h-11 bg-white/50" dir="ltr" {...registerForm.register("email")} />
                            {registerForm.formState.errors.email && <p className="text-xs text-destructive">{registerForm.formState.errors.email.message}</p>}
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex gap-2" dir="ltr">
                              <CountrySelect
                                value={countryCode}
                                onChange={setCountryCode}
                              />
                              <Input
                                id="reg-phone"
                                type="tel"
                                placeholder="5xxxxxxxx"
                                className="h-11 bg-white/50 flex-1 text-lg font-medium"
                                {...registerForm.register("phone")}
                              />
                            </div>
                            {registerForm.formState.errors.phone && <p className="text-xs text-destructive">{registerForm.formState.errors.phone.message}</p>}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="reg-password">كلمة المرور</Label>
                            <Input id="reg-password" type="password" className="h-11 bg-white/50" {...registerForm.register("password")} />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="reg-confirm">تأكيد كلمة المرور</Label>
                            <Input id="reg-confirm" type="password" className="h-11 bg-white/50" {...registerForm.register("confirmPassword")} />
                          </div>
                        </div>

                        {/* Password Strength Meter */}
                        <div className="space-y-2 px-1">
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-muted-foreground">قوة كلمة المرور:</span>
                            <span className={passwordStrength > 50 ? "text-green-600" : "text-orange-600"}>
                              {getStrengthText(passwordStrength)}
                            </span>
                          </div>
                          <Progress value={passwordStrength} className={`h-1.5 ${getStrengthColor(passwordStrength)} transition-all`} />
                        </div>

                        <Button
                          type="submit"
                          className="w-full font-bold shadow-lg h-12 mt-4"
                          disabled={registerMutation.isPending}
                        >
                          المتابعة لإنشاء الحساب
                        </Button>
                      </form>
                    </TabsContent>
                  </Tabs>
                </motion.div>
              )}

              {step === "selection" && (
                <motion.div
                  key="step-selection"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6 py-4"
                >
                  <div className="grid grid-cols-1 gap-4">
                    <Button
                      variant="outline"
                      className="h-24 flex flex-col gap-2 rounded-2xl border-2 hover:border-primary hover:bg-primary/5 transition-all group relative overflow-hidden disabled:opacity-50"
                      onClick={() => handleMethodSelect("gmail")}
                      disabled={registerMutation.isPending}
                    >
                      <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Mail className="h-20 w-20" />
                      </div>
                      <Mail className="h-8 w-8 text-red-500" />
                      <span className="font-bold text-lg">رسالة عبر Gmail</span>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-24 flex flex-col gap-2 rounded-2xl border-2 hover:border-primary hover:bg-primary/5 transition-all group relative overflow-hidden disabled:opacity-50"
                      onClick={() => handleMethodSelect("telegram")}
                      disabled={registerMutation.isPending}
                    >
                      <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:opacity-10 transition-opacity">
                        <MessageSquare className="h-20 w-20" />
                      </div>
                      <MessageSquare className="h-8 w-8 text-blue-500" />
                      <span className="font-bold text-lg">رسالة عبر Telegram</span>
                    </Button>
                  </div>

                  <Button variant="ghost" className="w-full" onClick={() => setStep("form")}>
                    رجوع لتعديل البيانات
                  </Button>
                </motion.div>
              )}

              {step === "otp" && (
                <motion.div
                  key="step-otp"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-6 py-6"
                >
                  <div className="flex justify-center gap-2" dir="ltr">
                    {/* Render inputs only for Gmail, hidden otherwise to avoid layout shifts/confusion */}
                    {otpMethod === 'gmail' && [0, 1, 2, 3, 4, 5].map((i) => (
                      <Input
                        key={i}
                        className="h-14 w-12 text-center text-2xl font-black rounded-xl border-2 focus:border-primary p-0"
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

                  {/* Main Content */}
                  {otpMethod === 'telegram' ? (
                    // Telegram UI
                    <div className="mb-6 space-y-6">
                      <div className="p-6 bg-blue-50 border border-blue-200 rounded-3xl text-center">
                        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                          <Send className="h-8 w-8 text-blue-600" />
                        </div>
                        <h3 className="font-bold text-xl text-blue-900 mb-2">التحقق السريع</h3>
                        <p className="text-blue-700/80 text-sm mb-6 leading-relaxed">
                          اضغط على الزر أدناه للانتقال إلى تيليجرام، ثم اضغط <b>"Start"</b> وشارك رقمك ليتم تأكيد حسابك تلقائياً.
                        </p>

                        {telegramLink ? (
                          <a
                            href={telegramLink}
                            target="_blank"
                            rel="noreferrer"
                            className="block w-full py-4 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-3 group"
                          >
                            <span className="text-lg">تأكيد عبر تيليجرام</span>
                            <Send className="h-5 w-5 group-hover:-translate-x-1 transition-transform rotate-180" />
                          </a>
                        ) : (
                          <div className="py-4 text-muted-foreground bg-gray-100 rounded-xl animate-pulse">جاري إنشاء الرابط...</div>
                        )}
                      </div>

                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground animate-pulse">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>بانتظار التأكيد من تيليجرام...</span>
                      </div>
                    </div>
                  ) : (
                    // Gmail OTP UI (Existing)
                    <div className="mb-6">
                      <div className="flex justify-center gap-2 mb-6" dir="ltr">
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <Input
                            key={i}
                            className="h-14 w-12 text-center text-2xl font-black rounded-xl border-2 focus:border-primary p-0"
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
                        className="w-full h-12 text-lg font-bold rounded-xl shadow-lg"
                        disabled={otpValue.length !== 6 || verifyOtpMutation.isPending || registerMutation.isPending}
                        onClick={verifyOtp}
                      >
                        {verifyOtpMutation.isPending || registerMutation.isPending ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="ml-2 h-5 w-5" />
                            تأكيد وإنشاء الحساب
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  <Button variant="ghost" className="w-full mt-2" onClick={() => setStep("selection")}>
                    تغيير وسيلة الاستلام
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </motion.div >
  );
}

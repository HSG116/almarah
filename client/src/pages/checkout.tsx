
import { useState, useEffect } from "react";

import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea"; // Assuming we have this or I'll use Input
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
    Check,
    MapPin,
    CreditCard,
    Truck,
    ShoppingBag,
    ChevronRight,
    ChevronLeft,
    Banknote,
    Navigation,
    Ticket,
    Percent,
    X,
    Clock
} from "lucide-react";
import UserLocationMap from "@/components/checkout/UserLocationMap";
import { isPointInPolygon } from "@/lib/geo";
import { DeliveryZone } from "@shared/schema";


const steps = [
    { id: 1, name: "تفاصيل الطلب", icon: ShoppingBag },
    { id: 2, name: "العنوان والتوصيل", icon: MapPin },
    { id: 3, name: "الدفع", icon: CreditCard },
];

export default function Checkout() {
    const { items, subtotal, clearCart } = useCart();
    const { user } = useAuth();
    const [, setLocation] = useLocation();
    const { toast } = useToast();

    const [currentStep, setCurrentStep] = useState(1);
    const [addressType, setAddressType] = useState<"saved" | "new">("saved");
    const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
    const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
    const [pickedLocation, setPickedLocation] = useState<[number, number] | null>(
        user?.gpsLat && user?.gpsLng ? [user.gpsLat, user.gpsLng] as [number, number] : null
    );
    const [couponCode, setCouponCode] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
    const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

    const { data: siteSettings = [] } = useQuery({
        queryKey: ["site_settings"],
        queryFn: async () => {
            const { data, error } = await supabase.from('site_settings').select('*');
            if (error) throw error;
            return data || [];
        }
    });

    const settingsMap = siteSettings.reduce((acc: any, curr: any) => {
        try {
            acc[curr.key] = JSON.parse(curr.value);
        } catch (e) {
            acc[curr.key] = curr.value;
        }
        return acc;
    }, {});

    const isStoreClosed = settingsMap.store_status === 'closed';



    const { data: zones = [] } = useQuery({
        queryKey: ["delivery_zones"],
        queryFn: async () => {
            const { data, error } = await supabase.from('delivery_zones').select('*').eq('is_active', true);
            if (error) throw error;
            return data;
        }
    });

    const [newAddress, setNewAddress] = useState({
        city: "",
        district: "",
        street: "",
        building: "",
        landmark: "",
        notes: ""
    });

    // Auto-detect zone when location or zones change
    useEffect(() => {
        if (pickedLocation && zones.length > 0 && !selectedZone) {
            const zone = zones.find((z: any) => {
                if (!z.coordinates) return false;
                const poly = typeof z.coordinates === 'string' ? JSON.parse(z.coordinates) : z.coordinates;
                return isPointInPolygon(pickedLocation, poly);
            });
            if (zone) setSelectedZone(zone);
        }
    }, [pickedLocation, zones]);




    const savedAddressStr = user?.address || (user?.city ? `${user.city}، ${user.district || ''}، ${user.street || ''}` : "");

    const orderMutation = useMutation({
        mutationFn: async () => {
            if (!user) throw new Error("يجب تسجيل الدخول");
            if (!selectedZone) throw new Error("يرجى اختيار منطقة التوصيل");

            let finalAddress = "";
            let notes = "";

            if (addressType === "saved" && savedAddressStr) {
                finalAddress = savedAddressStr;
            } else {
                if (!newAddress.city || !newAddress.street) throw new Error("يرجى ملء بيانات العنوان الأساسية");
                finalAddress = `${newAddress.city}، ${newAddress.district}، ${newAddress.street}، ${newAddress.building} - ${newAddress.landmark}`;
                notes = newAddress.notes;
            }

            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert([{
                    user_id: user.id,
                    total: (subtotal + (selectedZone?.fee || 0)) - (appliedCoupon ? (appliedCoupon.discount_type === 'percentage' ? (subtotal * appliedCoupon.discount_value / 100) : appliedCoupon.discount_value) : 0),
                    subtotal: subtotal,
                    delivery_fee: selectedZone?.fee || 0,
                    discount_amount: appliedCoupon ? (appliedCoupon.discount_type === 'percentage' ? (subtotal * appliedCoupon.discount_value / 100) : appliedCoupon.discount_value) : 0,
                    status: 'pending',
                    address: finalAddress,
                    notes: notes,
                    payment_method: paymentMethod,
                    customer_name: user.username,
                    customer_phone: user.phone,
                    gps_lat: pickedLocation?.[0],
                    gps_lng: pickedLocation?.[1]
                }])

                .select()
                .single();

            if (orderError) throw orderError;

            const itemsToInsert = items.map(item => ({
                order_id: orderData.id,
                product_id: item.id,
                product_name: item.name,
                quantity: item.quantity,
                price: item.price,
                cutting: item.cutting,
                packaging: item.packaging,
                extras: item.extras,
                notes: item.notes
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

            return orderData;
        },
        onSuccess: () => {
            toast({
                title: "تم الطلب بنجاح! 🎉",
                description: "شكراً لثقتك بنا، سيتم تجهيز طلبك في أسرع وقت.",
                className: "bg-green-600 text-white border-none",
                duration: 5000
            });
            clearCart();
            setLocation("/profile");
        },
        onError: (error: Error) => {
            toast({
                title: "خطأ",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleNext = () => {
        if (currentStep === 1) {
            if (items.length === 0) {
                toast({ title: "السلة فارغة", variant: "destructive" });
                return;
            }
            setCurrentStep(2);
        } else if (currentStep === 2) {
            if (!selectedZone) {
                toast({ title: "يرجى اختيار منطقة التوصيل أولاً", variant: "destructive" });
                return;
            }
            if (addressType === "new" && (!newAddress.city || !newAddress.street)) {
                toast({ title: "يرجى إكمال بيانات العنوان", variant: "destructive" });
                return;
            }
            if (addressType === "saved" && !savedAddressStr) {
                toast({ title: "لا يوجد عنوان محفوظ، يرجى إضافة عنوان جديد", variant: "destructive" });
                setAddressType("new");
                return;
            }
            setCurrentStep(3);
        } else {
            orderMutation.mutate();
        }
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
        else setLocation("/cart");
    };

    if (!user) {
        setLocation("/auth");
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-secondary/10 pb-24">
            <Navbar />

            {isStoreClosed && (
                <div className="container mx-auto px-4 pt-8">
                    <div className="bg-rose-100 border-2 border-rose-200 p-6 rounded-[2rem] text-rose-800 flex items-center gap-4 shadow-xl shadow-rose-100/50 animate-pulse">
                        <div className="bg-rose-600 text-white p-3 rounded-2xl">
                            <Clock className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-xl font-black">المحل مغلق حالياً</p>
                            <p className="font-bold opacity-80 text-sm">نعتذر منك، لا يمكننا استقبال طلبات في الوقت الحالي. يرجى مراجعة ساعات العمل في صفحة المتجر.</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="mb-10">
                    <div className="flex items-center justify-between relative">
                        <div className="absolute top-1/2 left-0 right-0 h-1 bg-muted -z-10 -translate-y-1/2 rounded-full" />
                        <div className="absolute top-1/2 left-0 right-0 h-1 bg-primary -z-10 -translate-y-1/2 rounded-full transition-all duration-500"
                            style={{ width: `${((currentStep - 1) / 2) * 100}%` }} />

                        {steps.map((step) => {
                            const isActive = step.id === currentStep;
                            const isCompleted = step.id < currentStep;

                            return (
                                <div key={step.id} className="flex flex-col items-center gap-2 bg-background p-2 rounded-xl">
                                    <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300
                    ${isActive ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110" :
                                            isCompleted ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30 text-muted-foreground bg-muted/30"}
                  `}>
                                        {isCompleted ? <Check className="w-6 h-6" /> : <step.icon className="w-5 h-5" />}
                                    </div>
                                    <span className={`text-sm font-bold ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                                        {step.name}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {currentStep === 1 && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold font-heading mb-4">مراجعة الطلب</h2>
                                <div className="grid gap-4">
                                    {items.map((item) => (
                                        <Card key={`${item.id}-${item.cutting}-${item.packaging}`} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow">
                                            <CardContent className="p-4 flex gap-4">
                                                <div className="h-24 w-24 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex justify-between items-start">
                                                        <h3 className="font-bold text-lg">{item.name}</h3>
                                                        <span className="font-bold text-primary">{item.price * item.quantity} ر.س</span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">الكمية: {item.quantity}</p>

                                                    {(item.cutting || item.packaging || item.extras) && (
                                                        <div className="mt-2 pt-2 border-t border-dashed text-sm space-y-1 bg-muted/30 p-2 rounded-md">
                                                            {item.cutting && (
                                                                <div className="flex gap-2">
                                                                    <span className="text-muted-foreground">التقطيع:</span>
                                                                    <span className="font-medium">{item.cutting}</span>
                                                                </div>
                                                            )}
                                                            {item.packaging && (
                                                                <div className="flex gap-2">
                                                                    <span className="text-muted-foreground">التغليف:</span>
                                                                    <span className="font-medium">{item.packaging}</span>
                                                                </div>
                                                            )}
                                                            {item.extras && (
                                                                <div className="flex gap-2">
                                                                    <span className="text-muted-foreground">إضافات:</span>
                                                                    <span className="font-medium">{item.extras}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        {currentStep === 2 && (
                            <div className="space-y-8">
                                <h2 className="text-2xl font-bold font-heading mb-4">عنوان التوصيل</h2>

                                <div className="space-y-4">
                                    <Label className="text-lg font-bold flex items-center gap-2 mb-4">
                                        <Truck className="w-5 h-5 text-primary" />
                                        تحديد موقع التوصيل (إجباري)
                                    </Label>

                                    <UserLocationMap
                                        initialLocation={pickedLocation || undefined}
                                        onLocationSelect={(latlng) => {
                                            setPickedLocation(latlng);
                                            // Find zone
                                            const zone = zones.find((z: any) => {
                                                if (!z.coordinates) return false;
                                                const poly = typeof z.coordinates === 'string' ? JSON.parse(z.coordinates) : z.coordinates;
                                                return isPointInPolygon(latlng, poly);
                                            });
                                            setSelectedZone(zone || null);

                                            if (zone) {
                                                toast({
                                                    title: `تم تحديد المنطقة: ${zone.name}`,
                                                    description: `رسوم التوصيل: ${zone.fee} ﷼`,
                                                    className: "bg-primary text-white border-none"
                                                });
                                            } else {
                                                toast({
                                                    title: "خارج نطاق التغطية",
                                                    description: "عذراً، الموقع المختار خارج مناطق التوصيل المتاحة حالياً.",
                                                    variant: "destructive"
                                                });
                                            }
                                        }}
                                    />

                                    {selectedZone && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="bg-emerald-500 text-white p-2 rounded-xl">
                                                    <Check className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-emerald-900 leading-tight">موقعك داخل منطقة: {selectedZone.name}</p>
                                                    <p className="text-xs text-emerald-600">رسوم التوصيل: {selectedZone.fee} ﷼</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {pickedLocation && !selectedZone && (
                                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3">
                                            <div className="bg-red-500 text-white p-2 rounded-xl">
                                                <Navigation className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-red-900 leading-tight">عذراً، الموقع خارج نطاق التغطية</p>
                                                <p className="text-xs text-red-600">يرجى اختيار موقع آخر داخل مناطق التوصيل المتاحة.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>


                                <Separator className="my-8" />

                                <RadioGroup value={addressType} onValueChange={(v) => setAddressType(v as "saved" | "new")} className="grid gap-6">
                                    <div className={`
                                        relative flex items-start gap-4 rounded-2xl border-2 p-6 cursor-pointer transition-all
                                        ${addressType === "saved" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-muted hover:border-primary/50 bg-white"}
                                    `} onClick={() => setAddressType("saved")}>
                                        <RadioGroupItem value="saved" id="saved" className="mt-1" />
                                        <div className="flex-1">
                                            <Label htmlFor="saved" className="cursor-pointer font-bold text-lg flex items-center gap-2">
                                                العنوان المحفوظ في حسابي
                                            </Label>
                                            {savedAddressStr ? (
                                                <p className="text-muted-foreground mt-2 leading-relaxed font-medium">{savedAddressStr}</p>
                                            ) : (
                                                <p className="text-amber-600 mt-2 text-sm bg-amber-50 p-3 rounded-xl border border-amber-100">لا يوجد عنوان محفوظ، يرجى ملء بيانات "عنوان جديد" بالأسفل.</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className={`
                                        relative flex items-start gap-4 rounded-2xl border-2 p-6 cursor-pointer transition-all
                                        ${addressType === "new" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-muted hover:border-primary/50 bg-white"}
                                    `} onClick={() => setAddressType("new")}>
                                        <RadioGroupItem value="new" id="new" className="mt-1" />
                                        <div className="flex-1">
                                            <Label htmlFor="new" className="cursor-pointer font-bold text-lg flex items-center gap-2">
                                                أريد إدخال عنوان يدوي / موقع آخر
                                            </Label>
                                            <AnimatePresence>
                                                {addressType === "new" && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="mt-6 grid gap-5 overflow-hidden"
                                                    >
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label>المدينة</Label>
                                                                <Input placeholder="الرياض" value={newAddress.city} onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })} className="h-11 rounded-xl" />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>الحي</Label>
                                                                <Input placeholder="الملقا" value={newAddress.district} onChange={(e) => setNewAddress({ ...newAddress, district: e.target.value })} className="h-11 rounded-xl" />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>اسم الشارع</Label>
                                                            <Input placeholder="اسم الشارع أو الشارع القريب" value={newAddress.street} onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })} className="h-11 rounded-xl" />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label>المبنى / الفيلا</Label>
                                                                <Input placeholder="رقم 12" value={newAddress.building} onChange={(e) => setNewAddress({ ...newAddress, building: e.target.value })} className="h-11 rounded-xl" />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>معلم مميز</Label>
                                                                <Input placeholder="بجانب السوبر ماركت" value={newAddress.landmark} onChange={(e) => setNewAddress({ ...newAddress, landmark: e.target.value })} className="h-11 rounded-xl" />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>ملاحظات السائق</Label>
                                                            <Textarea placeholder="اتصل بي عند الوصول..." value={newAddress.notes} onChange={(e) => setNewAddress({ ...newAddress, notes: e.target.value })} className="rounded-xl min-h-[80px]" />
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </RadioGroup>
                            </div>
                        )}

                        {currentStep === 3 && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold font-heading mb-4">طريقة الدفع</h2>

                                <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "cash" | "card")} className="grid gap-4">
                                    <div className={`
                                        relative flex items-center gap-4 rounded-2xl border-2 p-6 cursor-pointer transition-all
                                        ${paymentMethod === "cash" ? "border-primary bg-primary/5 ring-1 ring-primary shadow-md" : "border-muted hover:border-primary/50 bg-white"}
                                    `} onClick={() => setPaymentMethod("cash")}>
                                        <RadioGroupItem value="cash" id="cash" />
                                        <div className="p-3 bg-emerald-100 rounded-xl"><Banknote className="w-8 h-8 text-emerald-600" /></div>
                                        <div className="flex-1">
                                            <Label htmlFor="cash" className="cursor-pointer font-black text-lg block text-slate-900">الدفع عند الاستلام</Label>
                                            <p className="text-muted-foreground text-sm font-medium">ادفع نقداً أو بالشبكة عن استلام طلبك</p>
                                        </div>
                                    </div>

                                    <div className={`
                                        relative flex items-center gap-4 rounded-2xl border-2 p-6 cursor-pointer transition-all opacity-60
                                        ${paymentMethod === "card" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-muted bg-white"}
                                    `} onClick={() => setPaymentMethod("card")}>
                                        <RadioGroupItem value="card" id="card" />
                                        <div className="p-3 bg-blue-100 rounded-xl"><CreditCard className="w-8 h-8 text-blue-600" /></div>
                                        <div className="flex-1">
                                            <Label htmlFor="card" className="cursor-pointer font-black text-lg block text-slate-900">البطاقة البنكية (قريباً)</Label>
                                            <p className="text-muted-foreground text-sm font-medium">خدمة الدفع عبر مدى وفيزا قيد التجهيز</p>
                                        </div>
                                    </div>
                                </RadioGroup>

                                <div className="mt-8">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Ticket className="w-5 h-5 text-primary" />
                                        <Label className="text-lg font-bold">هل لديك كوبون خصم؟</Label>
                                    </div>

                                    <div className="relative group">
                                        <Input
                                            placeholder="أدخل رمز الكوبون هنا..."
                                            value={couponCode}
                                            onChange={(e) => setCouponCode(e.target.value.substring(0, 20).toUpperCase())}
                                            className="h-14 rounded-2xl pr-12 pl-32 font-bold text-lg border-2 focus:border-primary transition-all shadow-sm"
                                            disabled={!!appliedCoupon}
                                        />
                                        <Ticket className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground group-focus-within:text-primary transition-colors" />

                                        <div className="absolute left-2 top-1/2 -translate-y-1/2">
                                            {!appliedCoupon ? (
                                                <Button
                                                    size="sm"
                                                    className="h-10 rounded-xl px-6 font-bold"
                                                    onClick={async () => {
                                                        if (!couponCode) return;
                                                        setIsApplyingCoupon(true);
                                                        try {
                                                            const { data, error } = await supabase
                                                                .from('coupons')
                                                                .select('*')
                                                                .eq('code', couponCode)
                                                                .eq('is_active', true)
                                                                .single();

                                                            if (error || !data) throw new Error("الكوبون غير صحيح أو منتهي الصلاحية");

                                                            if (data.min_order_amount && subtotal < data.min_order_amount) {
                                                                throw new Error(`هذا الكوبون صالح للطلبات الأكثر من ${data.min_order_amount} ﷼`);
                                                            }

                                                            setAppliedCoupon(data);
                                                            toast({
                                                                title: "تم تطبيق الكوبون! 🎉",
                                                                description: `حصلت على خصم بقيمة ${data.discount_value}${data.discount_type === 'percentage' ? '%' : ' ﷼'}`,
                                                                className: "bg-primary text-white border-none"
                                                            });
                                                        } catch (err: any) {
                                                            toast({
                                                                title: "خطأ في الكوبون",
                                                                description: err.message,
                                                                variant: "destructive"
                                                            });
                                                        } finally {
                                                            setIsApplyingCoupon(false);
                                                        }
                                                    }}
                                                    disabled={isApplyingCoupon || !couponCode}
                                                >
                                                    {isApplyingCoupon ? "جاري..." : "تطبيق"}
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    className="h-10 rounded-xl px-4 font-bold text-red-500 hover:text-red-600 hover:bg-red-50"
                                                    onClick={() => {
                                                        setAppliedCoupon(null);
                                                        setCouponCode("");
                                                    }}
                                                >
                                                    <X className="w-4 h-4 ml-2" />
                                                    إزالة
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {appliedCoupon && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="mt-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-2 text-emerald-700">
                                                    <div className="bg-emerald-500 text-white p-1 rounded-md">
                                                        <Check className="w-3 h-3" />
                                                    </div>
                                                    <span className="text-sm font-bold">تم تفعيل الخصم بنجاح! ({appliedCoupon.code})</span>
                                                </div>
                                                <span className="text-sm font-black text-emerald-600">
                                                    -{appliedCoupon.discount_type === 'percentage' ? (subtotal * appliedCoupon.discount_value / 100) : appliedCoupon.discount_value} ﷼
                                                </span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <Card className="mt-10 bg-white border-2 border-primary/10 shadow-xl shadow-primary/5 rounded-3xl overflow-hidden">
                                    <div className="bg-primary text-white p-4 text-center font-bold">ملخص الفاتورة النهائية</div>
                                    <CardContent className="p-8 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500 font-bold">قيمة المنتجات</span>
                                            <span className="font-extrabold text-lg text-slate-800">{subtotal} ﷼</span>
                                        </div>
                                        <div className="flex justify-between items-center text-emerald-600">
                                            <div className="flex items-center gap-1">
                                                <Truck className="w-4 h-4" />
                                                <span className="font-bold">رسوم التوصيل ({selectedZone?.name || 'لم تحدد'})</span>
                                            </div>
                                            <span className="font-extrabold text-lg">+{selectedZone?.fee || 0} ﷼</span>
                                        </div>
                                        <Separator className="my-2" />
                                        <div className="flex justify-between items-center py-4">
                                            <span className="text-xl font-black text-slate-900">المبلغ الإجمالي</span>
                                            <div className="text-left">
                                                <p className="text-3xl font-black text-primary leading-none">
                                                    {((subtotal + (selectedZone?.fee || 0)) - (appliedCoupon ? (appliedCoupon.discount_type === 'percentage' ? (subtotal * appliedCoupon.discount_value / 100) : appliedCoupon.discount_value) : 0)).toLocaleString()} ﷼
                                                </p>
                                                <p className="text-[10px] text-muted-foreground mt-1">شامل ضريبة القيمة المضافة 15%</p>
                                            </div>
                                        </div>
                                        {appliedCoupon && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 flex justify-between items-center"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Percent className="w-4 h-4 text-emerald-600" />
                                                    <span className="text-xs font-bold text-emerald-700">تم تطبيق خصم الكوبون ({appliedCoupon.code})</span>
                                                </div>
                                                <span className="text-xs font-black text-emerald-600">
                                                    -{appliedCoupon.discount_type === 'percentage' ? (subtotal * appliedCoupon.discount_value / 100) : appliedCoupon.discount_value} ﷼
                                                </span>
                                            </motion.div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>

                <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t p-5 z-50 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                    <div className="container mx-auto max-w-4xl flex items-center gap-4">
                        <Button variant="ghost" size="lg" className="flex-1 h-14 rounded-2xl font-bold text-slate-500" onClick={handleBack}>
                            <ChevronRight className="w-5 h-5 ml-2" />
                            السابق
                        </Button>
                        <Button size="lg" className="flex-[2] h-14 rounded-2xl text-xl font-black shadow-xl shadow-primary/30 bg-primary hover:bg-primary/90"
                            onClick={() => {
                                if (isStoreClosed) {
                                    toast({ title: "المحل مغلق", description: "نعتذر، لا يمكن إتمام الطلب لأن المحل مغلق حالياً.", variant: "destructive" });
                                    return;
                                }
                                handleNext();
                            }}
                            disabled={orderMutation.isPending || (currentStep === 3 && isStoreClosed)}>
                            {orderMutation.isPending ? "جاري المعالجة..." : (currentStep === 3 ? "إرسال الطلب الآن" : "الخطوة التالية")}
                            {currentStep !== 3 && <ChevronLeft className="w-5 h-5 mr-2" />}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

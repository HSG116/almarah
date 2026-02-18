import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, MapPin, LogOut, Loader2, Package, Map as MapIcon, ShoppingCart, ChevronDown, ClipboardCheck, Settings2, Shield, Lock, UserCircle, Mail, Phone, Building, Navigation, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type Order } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { MapPicker } from "@/components/ui/map-picker";
import { Textarea } from "@/components/ui/textarea";

export default function Profile() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  // Address Form State
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [street, setStreet] = useState("");
  const [building, setBuilding] = useState("");
  const [landmark, setLandmark] = useState("");
  const [gpsLocation, setGpsLocation] = useState<{ lat: number, lng: number } | null>(null);

  useEffect(() => {
    if (user) {
      setCity(user.city || "");
      setDistrict(user.district || "");
      setStreet(user.street || "");
      setBuilding(user.building || "");
      setLandmark(user.landmark || "");
      if (user.gpsLat && user.gpsLng) {
        setGpsLocation({ lat: user.gpsLat, lng: user.gpsLng });
      } else if (!user.gpsLat && user.address && !user.city) {
        // Auto-fill from old address string if detailed fields are empty and we have an old address
        const oldParts = (user.address || "").split('،');
        if (oldParts.length > 0) setCity(oldParts[0]?.trim() || "");
        if (oldParts.length > 1) setDistrict(oldParts[1]?.trim() || "");
        if (oldParts.length > 2) setStreet(oldParts[2]?.trim() || "");
      }
    }
  }, [user]);

  const handleSaveAddress = async () => {
    if (!user) return;
    setIsSavingAddress(true);

    // Construct full address string for display compatible with old systems
    const fullAddress = [
      city,
      district,
      street,
      building ? `مبنى ${building}` : "",
      landmark ? `(${landmark})` : ""
    ].filter(Boolean).join('، ');

    try {
      const { error } = await supabase
        .from('users')
        .update({
          address: fullAddress,
          city,
          district,
          street,
          building,
          landmark,
          gps_lat: gpsLocation?.lat,
          gps_lng: gpsLocation?.lng
        })
        .eq('id', user.id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["auth_user"] });

      toast({
        title: "تم حفظ العنوان بنجاح",
        description: "تم تحديث بيانات التوصيل الخاصة بك",
      });
      setIsEditingAddress(false);
    } catch (e: any) {
      toast({
        title: "فشل حفظ العنوان",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setIsSavingAddress(false);
    }
  };

  const { data: orders = [], isLoading: ordersLoading } = useQuery<(Order & { items: any[] })[]>({
    queryKey: ["/api/orders", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            products (
              image,
              unit
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((order: any) => ({
        ...order,
        createdAt: order.created_at,
        items: (order.order_items || []).map((item: any) => ({
          ...item,
          product: item.products
        }))
      }));
    },
    enabled: !!user,
  });

  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      setLocation("/auth");
    } else {
      const isStaff = user.isAdmin || (user.role && user.role !== "customer");
      if (isStaff) {
        const staffHref = (user.role === "admin" || user.isAdmin ? "/admin" : `/${user.role}`);
        setLocation(staffHref);
      }
    }
  }, [user, setLocation]);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return { label: 'مكتمل', color: 'bg-green-100 text-green-700', icon: '✅' };
      case 'shipping':
        return { label: 'جاري التوصيل', color: 'bg-blue-100 text-blue-700', icon: '🚚' };
      case 'cancelled':
        return { label: 'ملغي', color: 'bg-red-100 text-red-700', icon: '❌' };
      case 'preparing':
        return { label: 'قيد التجهيز', color: 'bg-orange-100 text-orange-700', icon: '👨‍🍳' };
      default:
        return { label: 'قيد الانتظار', color: 'bg-gray-100 text-gray-700', icon: '⏳' };
    }
  };

  if (!user) return null;

  return (
    <motion.div
      className="min-h-screen bg-muted/10 pb-20 md:pb-0"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary border-2 border-primary/20 shadow-inner">
            <User className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-heading">مرحباً، {user.username}</h1>
            <p className="text-muted-foreground font-medium">{user.phone}</p>
          </div>
        </div>

        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 h-12 bg-white/50 backdrop-blur-sm p-1 rounded-xl shadow-sm border border-white/20">
            <TabsTrigger value="orders" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300">الطلبات</TabsTrigger>
            <TabsTrigger value="address" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300">العناوين</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300">الإعدادات</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <div className="space-y-6">
              {ordersLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-32 w-full rounded-3xl" />
                  <Skeleton className="h-32 w-full rounded-3xl" />
                </div>
              ) : orders.length > 0 ? (
                orders.map((order) => {
                  const statusInfo = getStatusInfo(order.status);
                  const isExpanded = expandedOrder === order.id;

                  return (
                    <Card key={order.id} className={`overflow-hidden border-none shadow-sm transition-all duration-500 rounded-3xl ${isExpanded ? 'ring-2 ring-primary/20 shadow-lg' : 'hover:shadow-md'}`}>
                      <CardContent className="p-0">
                        {/* Summary Header */}
                        <div
                          className="p-5 flex justify-between items-center cursor-pointer hover:bg-muted/5 transition-colors"
                          onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                        >
                          <div className="flex gap-4 items-center">
                            <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center text-primary relative group overflow-hidden">
                              <Package className="h-7 w-7" />
                              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <span className="font-bold text-lg">طلب #{order.id}</span>
                                <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${statusInfo.color}`}>
                                  {statusInfo.icon} {statusInfo.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                <span className="flex items-center gap-1">
                                  {new Date(order.createdAt!).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </span>
                                <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                                <span>{new Date(order.createdAt!).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                                <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                                <span>{order.items.length} منتجات</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-left flex flex-col items-end gap-1">
                            <p className="font-black text-xl text-primary">{order.total} <span className="text-xs font-bold mr-0.5">ر.س</span></p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-[11px] font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-full px-4 gap-2"
                            >
                              {isExpanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                              <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                                <ChevronDown className="h-3 w-3" />
                              </motion.div>
                            </Button>
                          </div>
                        </div>

                        {/* Expandable Details */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="border-t border-muted/30 bg-muted/5 overflow-hidden"
                            >
                              <div className="p-6 space-y-6">
                                {/* Order Timeline or Basic Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-5 rounded-2xl shadow-sm border border-muted/20">
                                  <div>
                                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">تفاصيل التوصيل</h4>
                                    <div className="flex gap-3 items-start">
                                      <MapPin className="h-4 w-4 text-primary mt-0.5" />
                                      <p className="text-sm font-medium leading-relaxed">{order.address}</p>
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">الدفع والملاحظات</h4>
                                    <div className="space-y-2">
                                      <p className="text-sm font-bold flex justify-between">
                                        <span className="text-muted-foreground">طريقة الدفع:</span>
                                        <span>{order.paymentMethod === 'cash' ? 'كاش عند الاستلام' : 'دفع إلكتروني'}</span>
                                      </p>
                                      {order.notes && (
                                        <div className="pt-2">
                                          <p className="text-[10px] font-bold text-muted-foreground mb-1">ملاحظات الطلب:</p>
                                          <p className="text-xs italic bg-muted/50 p-2 rounded-lg">{order.notes}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Products List */}
                                <div className="space-y-3">
                                  <h4 className="text-sm font-bold flex items-center gap-2 mr-1">
                                    <ShoppingCart className="h-4 w-4 text-primary" />
                                    المنتجات ({order.items.length})
                                  </h4>
                                  <div className="space-y-3">
                                    {order.items.map((item: any, idx: number) => (
                                      <div key={idx} className="flex gap-4 bg-white p-4 rounded-2xl shadow-sm border border-muted/10 group hover:border-primary/20 transition-colors">
                                        <div className="h-20 w-20 rounded-xl overflow-hidden bg-muted flex-shrink-0 shadow-sm">
                                          <img
                                            src={item.product?.image || "/logo.png"}
                                            alt={item.productName}
                                            className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                                          />
                                        </div>
                                        <div className="flex-1 flex justify-between items-center">
                                          <div className="space-y-1">
                                            <h5 className="font-bold text-foreground text-base">{item.productName}</h5>
                                            <p className="text-xs font-medium text-muted-foreground">
                                              {item.quantity} × {item.price} ر.س / {item.product?.unit || 'حبة'}
                                            </p>

                                            {/* Special Options Badge */}
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                              {item.cutting && (
                                                <span className="text-[9px] font-bold bg-secondary/30 text-secondary-foreground px-2 py-0.5 rounded-full ring-1 ring-secondary/20">
                                                  التقطيع: {item.cutting}
                                                </span>
                                              )}
                                              {item.packaging && (
                                                <span className="text-[9px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full ring-1 ring-amber-200">
                                                  التغليف: {item.packaging}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <div className="text-left font-black text-primary text-lg">
                                            {item.price * item.quantity} <span className="text-[10px] font-bold">ر.س</span>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Footer Action */}
                                <div className="pt-2 flex justify-end">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full font-bold text-xs px-6 hover:bg-primary hover:text-white transition-all shadow-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Could add reorder logic here
                                    }}
                                  >
                                    إعادة طلب
                                  </Button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <div className="text-center py-16 text-muted-foreground bg-white rounded-[40px] shadow-sm flex flex-col items-center gap-4 border-2 border-dashed border-muted/30">
                  <div className="h-20 w-20 rounded-full bg-muted/20 flex items-center justify-center">
                    <Package className="h-10 w-10 opacity-30" />
                  </div>
                  <div>
                    <p className="font-bold text-lg text-foreground">لا توجد طلبات سابقة بعد</p>
                    <p className="text-xs">ابدأ تسوق أشهى الذبائح الآن</p>
                  </div>
                  <Button
                    className="rounded-full px-10 font-bold shadow-lg shadow-primary/20"
                    onClick={() => setLocation("/products")}
                  >
                    ابدأ التسوق الآن
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>


          <TabsContent value="address">
            <div className="space-y-6">
              <Card className="border-none shadow-sm overflow-hidden rounded-[32px] bg-white">
                <div className="h-2 bg-primary/10 w-full" />
                <CardContent className="p-8">
                  <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="h-20 w-20 rounded-3xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10 shadow-sm shrink-0">
                      <Navigation className="h-10 w-10" />
                    </div>

                    <div className="flex-1 space-y-6 w-full">
                      <div className="flex justify-between items-start">
                        <div>
                          <h2 className="text-xl font-bold mb-1 font-heading">عنوان التوصيل الرئيسي</h2>
                          <p className="text-sm text-muted-foreground">هذا هو العنوان الذي سيتم استخدامه لتوصيل ذبائحك</p>
                        </div>
                        {!isEditingAddress && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-full h-10 px-6 font-bold hover:bg-primary hover:text-white transition-all duration-300 border-primary/20"
                              onClick={() => {
                                navigator.clipboard.writeText(user.address || "");
                                toast({ title: "تم نسخ العنوان", description: "يمكنك الآن مشاركته بسهولة" });
                              }}
                            >
                              <ClipboardCheck className="ml-2 h-4 w-4" />
                              نسخ
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              className="rounded-full h-10 px-6 font-bold shadow-lg shadow-primary/20"
                              onClick={() => setIsEditingAddress(true)}
                            >
                              {user.address ? "تعديل" : "إضافة عنوان"}
                            </Button>
                          </div>
                        )}
                      </div>

                      {!isEditingAddress ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="p-4 rounded-2xl bg-muted/30 border border-muted/20 hover:border-primary/20 transition-colors">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">المدينة والحي</p>
                            <p className="font-bold flex items-center gap-2">
                              <Building className="h-3.5 w-3.5 text-primary" />
                              {user.city || "غير محدد"} / {user.district || "غير محدد"}
                            </p>
                          </div>
                          <div className="p-4 rounded-2xl bg-muted/30 border border-muted/20 hover:border-primary/20 transition-colors">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">الشارع والمبنى</p>
                            <p className="font-bold">
                              {user.street || "غير محدد"} {user.building ? `، مبنى ${user.building}` : ""}
                            </p>
                          </div>
                          <div className="p-4 rounded-2xl bg-muted/30 border border-muted/20 hover:border-primary/20 transition-colors md:col-span-2 lg:col-span-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">أقرب معلم</p>
                            <p className="font-bold truncate">
                              {user.landmark || "لا توجد علامات مميزة"}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-top-4 duration-500">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-bold mr-1">المدينة</Label>
                              <Input
                                placeholder="مثال: الرياض"
                                value={city}
                                className="rounded-xl h-12 bg-muted/20 border-muted/30 focus:border-primary/50"
                                onChange={(e) => setCity(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-bold mr-1">الحي</Label>
                              <Input
                                placeholder="مثال: الملقا"
                                value={district}
                                className="rounded-xl h-12 bg-muted/20 border-muted/30 focus:border-primary/50"
                                onChange={(e) => setDistrict(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-bold mr-1">اسم الشارع</Label>
                              <Input
                                placeholder="أدخل اسم الشارع"
                                value={street}
                                className="rounded-xl h-12 bg-muted/20 border-muted/30 focus:border-primary/50"
                                onChange={(e) => setStreet(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-bold mr-1">رقم المبنى / العمارة</Label>
                              <Input
                                placeholder="مثال: 12 أو عمارة أ"
                                value={building}
                                className="rounded-xl h-12 bg-muted/20 border-muted/30 focus:border-primary/50"
                                onChange={(e) => setBuilding(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs font-bold mr-1">وصف إضافي / أقرب معلم</Label>
                            <Textarea
                              placeholder="مثال: بجوار المسجد، البوابة السوداء..."
                              value={landmark}
                              className="rounded-xl min-h-[100px] bg-muted/20 border-muted/30 focus:border-primary/50"
                              onChange={(e) => setLandmark(e.target.value)}
                            />
                          </div>

                          <div className="pt-2 rounded-3xl overflow-hidden border border-muted/20 shadow-inner">
                            <MapPicker
                              location={gpsLocation}
                              onLocationSelect={(lat, lng) => setGpsLocation({ lat, lng })}
                            />
                          </div>

                          <div className="flex gap-3 justify-end pt-6 border-t font-bold">
                            <Button
                              variant="ghost"
                              className="rounded-full px-8 h-12"
                              onClick={() => setIsEditingAddress(false)}
                              disabled={isSavingAddress}
                            >
                              إلغاء
                            </Button>
                            <Button
                              onClick={handleSaveAddress}
                              disabled={isSavingAddress}
                              className="rounded-full px-12 h-12 shadow-lg shadow-primary/30 font-black"
                            >
                              {isSavingAddress ? (
                                <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                              ) : (
                                <MapIcon className="ml-2 h-5 w-5" />
                              )}
                              حفظ ومزامنة العنوان
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tips Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-primary/5 p-5 rounded-3xl border border-primary/10 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-primary shadow-sm">
                    <Star className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">سرعة التوصيل</h4>
                    <p className="text-[10px] text-muted-foreground">تأكد من دقة العنوان وموقع الـ GPS لضمان وصول مندوبنا بأسرع وقت.</p>
                  </div>
                </div>
                <div className="bg-secondary/5 p-5 rounded-3xl border border-secondary/10 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-secondary shadow-sm">
                    <Shield className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">خصوصية بياناتك</h4>
                    <p className="text-[10px] text-muted-foreground">بيانات عنوانك مشفرة ومؤمنة تماماً، وتستخدم فقط لأغراض التوصيل.</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Profile Card Summary */}
              <Card className="border-none shadow-sm rounded-[32px] bg-white overflow-hidden h-fit">
                <div className="bg-gradient-to-br from-primary via-primary/80 to-primary/60 h-32 p-6 flex flex-col justify-end">
                  <div className="absolute top-4 right-4 h-24 w-24 bg-white/10 rounded-full blur-2xl" />
                </div>
                <CardContent className="px-6 pb-8 -mt-12 text-center">
                  <div className="relative inline-block mb-4">
                    <div className="h-24 w-24 rounded-full bg-white p-1.5 shadow-xl mx-auto">
                      <div className="h-full w-full rounded-full bg-primary/10 flex items-center justify-center text-primary border-2 border-primary/5">
                        <UserCircle className="h-12 w-12" />
                      </div>
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-green-500 border-4 border-white flex items-center justify-center" title="حساب موثق">
                      <Shield className="h-4 w-4 text-white" />
                    </div>
                  </div>

                  <h3 className="text-xl font-bold font-heading">{user.username}</h3>
                  <p className="text-xs text-muted-foreground mb-6">عضو في المراح منذ {new Date(user.createdAt!).getFullYear()}</p>

                  <div className="space-y-4 text-right">
                    <div className="p-3 rounded-2xl bg-muted/30 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-white text-primary shadow-sm">
                          <Star className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-bold">اكتمال الملف</span>
                      </div>
                      <span className="text-xs font-black text-primary">85%</span>
                    </div>
                    <div className="w-full bg-muted/50 h-1.5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "85%" }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="bg-primary h-full rounded-full"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Main Settings Body */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="border-none shadow-sm rounded-[32px] bg-white overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-8 space-y-8">
                      {/* Public Profile Section */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Settings2 className="h-5 w-5 text-primary" />
                          <h4 className="font-bold text-lg">معلومات الحساب</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2 p-4 rounded-2xl bg-muted/20 border border-muted/30 group hover:bg-white hover:border-primary/20 transition-all duration-300">
                            <div className="flex items-center gap-3 text-muted-foreground mb-1">
                              <User className="h-4 w-4" />
                              <Label className="text-[10px] font-bold uppercase tracking-wider">اسم المستخدم</Label>
                            </div>
                            <p className="font-bold text-foreground px-1">{user.username}</p>
                          </div>

                          <div className="space-y-2 p-4 rounded-2xl bg-muted/20 border border-muted/30 group hover:bg-white hover:border-primary/20 transition-all duration-300">
                            <div className="flex items-center gap-3 text-muted-foreground mb-1">
                              <Mail className="h-4 w-4" />
                              <Label className="text-[10px] font-bold uppercase tracking-wider">البريد الإلكتروني</Label>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="font-bold text-foreground px-1">{user.email}</p>
                              <span className="text-[9px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-lg">موثق</span>
                            </div>
                          </div>

                          <div className="space-y-2 p-4 rounded-2xl bg-muted/20 border border-muted/30 group hover:bg-white hover:border-primary/20 transition-all duration-300 md:col-span-2">
                            <div className="flex items-center gap-3 text-muted-foreground mb-1">
                              <Phone className="h-4 w-4" />
                              <Label className="text-[10px] font-bold uppercase tracking-wider">رقم الجوال النشط</Label>
                            </div>
                            <p className="font-bold text-foreground px-1">{user.phone}</p>
                          </div>
                        </div>
                      </div>

                      {/* Security Section */}
                      <div className="space-y-4 pt-4 border-t border-muted/30">
                        <div className="flex items-center gap-2 mb-2">
                          <Lock className="h-5 w-5 text-primary" />
                          <h4 className="font-bold text-lg">الأمان والخصوصية</h4>
                        </div>

                        <div className="flex flex-col gap-3">
                          <Button variant="outline" className="justify-between h-14 rounded-2xl font-bold px-6 border-muted-foreground/10 hover:border-primary/30 group">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                <Shield className="h-4 w-4" />
                              </div>
                              <span>تغيير كلمة المرور</span>
                            </div>
                            <ChevronDown className="h-4 w-4 rotate-270 opacity-50 group-hover:opacity-100" />
                          </Button>

                          <Button variant="outline" className="justify-between h-14 rounded-2xl font-bold px-6 border-muted-foreground/10 hover:border-primary/30 group">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-orange-100 text-orange-600">
                                <Lock className="h-4 w-4" />
                              </div>
                              <span>المصادقة الثنائية</span>
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground bg-muted h-6 flex items-center px-3 rounded-full">قريباً</span>
                          </Button>
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="pt-8 border-t border-muted/30 mt-4 flex flex-col md:flex-row gap-4">
                        <Button
                          variant="ghost"
                          className="flex-1 h-14 rounded-2xl font-bold group hover:bg-red-50 hover:text-destructive overflow-hidden relative"
                          onClick={() => logoutMutation.mutate()}
                          disabled={logoutMutation.isPending}
                        >
                          {logoutMutation.isPending ? (
                            <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                          ) : (
                            <LogOut className="ml-2 h-5 w-5 text-destructive group-hover:scale-110 transition-transform" />
                          )}
                          تسجيل الخروج من الحساب
                          <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </motion.div>
  );
}

import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, MapPin, LogOut, Loader2, Package, Map as MapIcon } from "lucide-react";
import { motion } from "framer-motion";
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

  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('orders')
        .select(`*, order_items (*)`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((order: any) => ({
        ...order,
        createdAt: order.created_at, // Map snake_case to camelCase
        items: order.order_items
      }));
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) {
      setLocation("/auth");
    }
  }, [user, setLocation]);

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
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <User className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-heading">مرحباً، {user.username}</h1>
            <p className="text-muted-foreground">{user.phone}</p>
          </div>
        </div>

        <Tabs defaultValue="address" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 h-12">
            <TabsTrigger value="orders">الطلبات</TabsTrigger>
            <TabsTrigger value="address">العناوين</TabsTrigger>
            <TabsTrigger value="settings">الإعدادات</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <div className="space-y-4">
              {ordersLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full rounded-2xl" />
                  <Skeleton className="h-24 w-full rounded-2xl" />
                </div>
              ) : orders.length > 0 ? (
                orders.map((order) => (
                  <Card key={order.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-bold">طلب #{order.id}</span>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${order.status === 'completed' ? 'bg-green-100 text-green-700' :
                              order.status === 'shipping' ? 'bg-blue-100 text-blue-700' :
                                order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                  order.status === 'preparing' ? 'bg-orange-100 text-orange-700' :
                                    'bg-gray-100 text-gray-700'
                            }`}>
                            {order.status === 'completed' ? 'مكتمل ✅' :
                              order.status === 'shipping' ? 'جاري التوصيل 🚚' :
                                order.status === 'cancelled' ? 'ملغي ❌' :
                                  order.status === 'preparing' ? 'قيد التجهيز 👨‍🍳' :
                                    'قيد الانتظار ⏳'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{new Date(order.createdAt!).toLocaleDateString('ar-SA')}</p>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-primary">{order.total} ر.س</p>
                        <Button variant="link" className="h-auto p-0 text-xs">التفاصيل</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-10 text-muted-foreground bg-white rounded-2xl shadow-sm flex flex-col items-center gap-2">
                  <Package className="h-12 w-12 opacity-20" />
                  <p>لا توجد طلبات سابقة بعد</p>
                  <Button variant="link" onClick={() => setLocation("/products")}>ابدأ التسوق الآن</Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="address">
            <Card className="border-none shadow-sm mb-4">
              <CardContent className="p-4">
                <div className="flex gap-4 items-start">
                  <div className="bg-muted/50 p-3 rounded-lg h-fit">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold mb-1">العنوان الحالي</h3>
                        {!isEditingAddress && (
                          <p className="text-sm text-muted-foreground whitespace-pre-line">
                            {user.address ? user.address : "لم يتم تحديد عنوان بعد"}
                          </p>
                        )}
                      </div>
                      {!isEditingAddress && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditingAddress(true)}
                        >
                          {user.address ? "تعديل العنوان" : "إضافة عنوان"}
                        </Button>
                      )}
                    </div>

                    {isEditingAddress && (
                      <div className="space-y-6 pt-4 border-t animate-in fade-in slide-in-from-top-4 duration-300">
                        {/* Address Form Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>المدينة</Label>
                            <Input
                              placeholder="مثال: الرياض"
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>الحي</Label>
                            <Input
                              placeholder="مثال: الملقا"
                              value={district}
                              onChange={(e) => setDistrict(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>اسم الشارع</Label>
                            <Input
                              placeholder="أدخل اسم الشارع"
                              value={street}
                              onChange={(e) => setStreet(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>رقم المبنى / العمارة</Label>
                            <Input
                              placeholder="مثال: 12 أو عمارة أ"
                              value={building}
                              onChange={(e) => setBuilding(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>وصف إضافي / أقرب معلم</Label>
                          <Textarea
                            placeholder="مثال: بجوار المسجد، البوابة السوداء..."
                            value={landmark}
                            onChange={(e) => setLandmark(e.target.value)}
                          />
                        </div>

                        {/* Map Picker */}
                        <div className="pt-2">
                          <MapPicker
                            location={gpsLocation}
                            onLocationSelect={(lat, lng) => setGpsLocation({ lat, lng })}
                          />
                        </div>

                        <div className="flex gap-2 justify-end pt-4 border-t">
                          <Button
                            variant="ghost"
                            onClick={() => setIsEditingAddress(false)}
                            disabled={isSavingAddress}
                          >
                            إلغاء
                          </Button>
                          <Button
                            onClick={handleSaveAddress}
                            disabled={isSavingAddress}
                            className="px-8"
                          >
                            {isSavingAddress ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <MapIcon className="mr-2 h-4 w-4" />
                            )}
                            حفظ العنوان
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="border-none shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>اسم المستخدم</Label>
                    <Input defaultValue={user.username} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>البريد الإلكتروني</Label>
                    <Input defaultValue={user.email} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>رقم الجوال</Label>
                    <Input defaultValue={user.phone} disabled />
                  </div>
                </div>

                <div className="pt-4 border-t mt-4">
                  <Button
                    variant="ghost"
                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                  >
                    {logoutMutation.isPending ? (
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="ml-2 h-4 w-4" />
                    )}
                    تسجيل الخروج
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </motion.div>
  );
}

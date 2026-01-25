import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, MapPin, LogOut } from "lucide-react";
import { motion } from "framer-motion";

export default function Profile() {
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
            <h1 className="text-2xl font-bold font-heading">مرحباً، عبد الله</h1>
            <p className="text-muted-foreground">0551234567</p>
          </div>
        </div>

        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 h-12">
            <TabsTrigger value="orders">الطلبات</TabsTrigger>
            <TabsTrigger value="address">العناوين</TabsTrigger>
            <TabsTrigger value="settings">الإعدادات</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <div className="space-y-4">
              {[
                { id: "#12345", date: "23 يناير 2026", status: "تم التوصيل", color: "bg-green-100 text-green-700", total: "1450 ر.س" },
                { id: "#12346", date: "20 يناير 2026", status: "قيد التجهيز", color: "bg-yellow-100 text-yellow-700", total: "85 ر.س" },
              ].map((order) => (
                <Card key={order.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-bold">طلب {order.id}</span>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${order.color}`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{order.date}</p>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-primary">{order.total}</p>
                      <Button variant="link" className="h-auto p-0 text-xs">التفاصيل</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="address">
            <Card className="border-none shadow-sm mb-4">
              <CardContent className="p-4 flex gap-4">
                <div className="bg-muted/50 p-3 rounded-lg h-fit">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold mb-1">المنزل</h3>
                  <p className="text-sm text-muted-foreground mb-3">الرياض، حي الملقا، شارع أنس بن مالك</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8">تعديل</Button>
                    <Button variant="ghost" size="sm" className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10">حذف</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Button className="w-full border-dashed" variant="outline">
              <MapPin className="mr-2 h-4 w-4" />
              إضافة عنوان جديد
            </Button>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="border-none shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label>الاسم الكامل</Label>
                  <Input defaultValue="عبد الله محمد" />
                </div>
                <div className="space-y-2">
                  <Label>البريد الإلكتروني</Label>
                  <Input defaultValue="abdullah@example.com" />
                </div>
                <Button className="w-full">حفظ التغييرات</Button>
                
                <div className="pt-4 border-t mt-4">
                  <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10">
                    <LogOut className="mr-2 h-4 w-4" />
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

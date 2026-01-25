import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Clock, MapPin, Scissors, Truck } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

export default function StaffDashboard() {
  const [role, setRole] = useState("butcher"); // cashier, butcher, delivery

  return (
    <div className="min-h-screen bg-muted/10 pb-20">
      <div className="bg-card border-b p-4 sticky top-0 z-10">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold font-heading">بوابة الموظفين</h1>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant={role === "cashier" ? "default" : "outline"}
              onClick={() => setRole("cashier")}
            >
              كاشير
            </Button>
            <Button 
              size="sm" 
              variant={role === "butcher" ? "default" : "outline"}
              onClick={() => setRole("butcher")}
            >
              جزار
            </Button>
            <Button 
              size="sm" 
              variant={role === "delivery" ? "default" : "outline"}
              onClick={() => setRole("delivery")}
            >
              توصيل
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        
        {role === "butcher" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">طلبات التجهيز والتقطيع</h2>
              <Badge variant="secondary" className="text-lg px-4 py-1">5 طلبات معلقة</Badge>
            </div>
            
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border-l-4 border-l-primary shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-lg">طلب #102{i}</h3>
                        <p className="text-muted-foreground text-sm">منذ 15 دقيقة</p>
                      </div>
                      <Badge>جديد</Badge>
                    </div>
                    
                    <div className="bg-muted/30 p-4 rounded-lg space-y-3 mb-4">
                      <div className="flex items-center gap-3">
                        <Scissors className="h-5 w-5 text-primary" />
                        <span className="font-bold">خروف نعيمي كامل</span>
                      </div>
                      <ul className="list-disc list-inside text-sm text-muted-foreground pr-8 space-y-1">
                        <li>تقطيع ثلاجة صغير</li>
                        <li>بدون شحم</li>
                        <li>تغليف أطباق</li>
                      </ul>
                    </div>

                    <Button className="w-full gap-2" size="lg">
                      <CheckCircle2 className="h-5 w-5" />
                      تأكيد التجهيز
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {role === "delivery" && (
          <div className="space-y-6">
             <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">طلبات التوصيل</h2>
            </div>

            <div className="grid gap-4">
              <Card className="border-l-4 border-l-green-600 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg">طلب #1020</h3>
                      <div className="flex items-center gap-2 text-green-600 mt-1">
                        <Truck className="h-4 w-4" />
                        <span className="text-sm font-bold">جاري التوصيل</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">اتصال بالعميل</Button>
                  </div>
                  
                  <div className="bg-muted/30 p-4 rounded-lg space-y-2 mb-4">
                    <div className="flex gap-2">
                      <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
                      <p className="text-sm">الرياض، حي النرجس، شارع 25</p>
                    </div>
                  </div>

                  <Button className="w-full bg-green-600 hover:bg-green-700 gap-2" size="lg">
                    <CheckCircle2 className="h-5 w-5" />
                    تم التسليم
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {role === "cashier" && (
          <div className="text-center py-20 text-muted-foreground">
            <h2 className="text-2xl font-bold mb-4">واجهة الكاشير</h2>
            <p>إدارة المدفوعات وتأكيد الطلبات</p>
          </div>
        )}

      </div>
    </div>
  );
}

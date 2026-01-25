import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Users, 
  Settings, 
  TrendingUp, 
  Package, 
  CreditCard 
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-muted/10 flex">
      {/* Sidebar */}
      <div className="w-64 bg-card border-l hidden md:block min-h-screen sticky top-0">
        <div className="p-6">
          <h2 className="text-2xl font-bold font-heading text-primary">لوحة التحكم</h2>
        </div>
        <div className="space-y-1 px-3">
          <Button variant="secondary" className="w-full justify-start gap-3 mb-1 font-bold">
            <LayoutDashboard className="h-5 w-5" />
            الرئيسية
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 mb-1">
            <ShoppingBag className="h-5 w-5" />
            الطلبات
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 mb-1">
            <Package className="h-5 w-5" />
            المنتجات
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 mb-1">
            <Users className="h-5 w-5" />
            المستخدمين
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 mb-1">
            <Users className="h-5 w-5" />
            الموظفين
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 mb-1">
            <Settings className="h-5 w-5" />
            الإعدادات
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold font-heading">ملخص اليوم</h1>
          <Button>تصدير التقرير</Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { title: "إجمالي المبيعات", value: "12,450 ر.س", icon: TrendingUp, color: "text-green-600" },
            { title: "الطلبات الجديدة", value: "24", icon: ShoppingBag, color: "text-blue-600" },
            { title: "العملاء الجدد", value: "12", icon: Users, color: "text-purple-600" },
            { title: "متوسط السلة", value: "320 ر.س", icon: CreditCard, color: "text-orange-600" },
          ].map((stat, i) => (
            <Card key={i} className="border-none shadow-sm">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1 font-medium">{stat.title}</p>
                  <h3 className="text-2xl font-bold">{stat.value}</h3>
                </div>
                <div className={`p-3 rounded-full bg-muted/50 ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Orders Table */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>آخر الطلبات</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم الطلب</TableHead>
                  <TableHead className="text-right">العميل</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">الإجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { id: "#1023", client: "أحمد علي", status: "جديد", amount: "450 ر.س", date: "منذ 10 دقائق", variant: "default" },
                  { id: "#1022", client: "سارة محمد", status: "قيد التجهيز", amount: "120 ر.س", date: "منذ 30 دقيقة", variant: "secondary" },
                  { id: "#1021", client: "خالد عمر", status: "في الطريق", amount: "890 ر.س", date: "منذ ساعة", variant: "outline" },
                  { id: "#1020", client: "منال يوسف", status: "تم التوصيل", amount: "230 ر.س", date: "منذ ساعتين", variant: "outline" },
                ].map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell>{order.client}</TableCell>
                    <TableCell>
                      <Badge variant={order.variant as any}>{order.status}</Badge>
                    </TableCell>
                    <TableCell>{order.amount}</TableCell>
                    <TableCell>{order.date}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost">التفاصيل</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

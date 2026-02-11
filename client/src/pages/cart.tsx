import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Minus, ArrowRight, CreditCard } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export default function Cart() {
  const { items: cartItems, updateQuantity, removeItem, subtotal, deliveryFee, total, clearCart } = useCart();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();


  const handleCheckout = () => {
    if (!user) {
      toast({
        title: "يرجى تسجيل الدخول",
        description: "يجب عليك تسجيل الدخول للمتابعة.",
        variant: "destructive",
      });
      setLocation("/auth");
      return;
    }
    setLocation("/checkout");
  };

  return (
    <motion.div
      className="min-h-screen bg-muted/10 pb-24 md:pb-0"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 font-heading">سلة المراح</h1>

        {cartItems.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <Card key={item.id} className="overflow-hidden border-none shadow-sm">
                  <CardContent className="p-4 flex gap-4 items-center">
                    <div className="h-20 w-20 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground truncate">{item.name}</h3>
                      <p className="text-primary font-bold">{item.price} ر.س</p>
                    </div>

                    <div className="flex items-center gap-3 bg-secondary/30 p-1 rounded-lg">
                      <Button
                        variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-background"
                        onClick={() => updateQuantity(item.id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-4 text-center text-sm font-bold">{item.quantity}</span>
                      <Button
                        variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-background"
                        onClick={() => updateQuantity(item.id, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    <Button
                      variant="ghost" size="icon" className="text-muted-foreground hover:text-red-500 hover:bg-red-50"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}


            </div>

            <div className="lg:col-span-1">
              <Card className="border-none shadow-md sticky top-24">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-4 font-heading">ملخص الطلب</h3>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">المجموع الفرعي</span>
                      <span className="font-bold">{subtotal} ر.س</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">التوصيل</span>
                      <span className="font-bold">{deliveryFee} ر.س</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold text-primary">
                      <span>الإجمالي</span>
                      <span>{total} ر.س</span>
                    </div>
                  </div>

                  <Button
                    className="w-full mt-6 h-12 text-lg font-bold shadow-lg gap-2"
                    size="lg"
                    onClick={handleCheckout}
                  >
                    <CreditCard className="h-5 w-5" />
                    متابعة عملية الشراء
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl shadow-sm">
            <div className="bg-muted/30 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-muted-foreground">
              <ArrowRight className="h-10 w-10 rotate-180" />
            </div>
            <h2 className="text-2xl font-bold mb-2">سلتك فارغة</h2>
            <p className="text-muted-foreground mb-8">لم تقم بإضافة أي منتجات للسلة بعد</p>
            <Link href="/products">
              <Button size="lg" className="px-8 rounded-full font-bold">تصفح المنتجات</Button>
            </Link>
          </div>
        )}
      </div>

      <BottomNav />
    </motion.div>
  );
}

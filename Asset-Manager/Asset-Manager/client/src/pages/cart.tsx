import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { products } from "@/lib/mock-data";
import { Trash2, Plus, Minus, ArrowRight, CreditCard, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const initialCartItems = [
  { 
    ...products[0], 
    quantity: 1,
    customizations: {
      cutType: "مقطع قطع متوسطة",
      packaging: "تغليف عادي",
      notes: "بدون دهن زائد"
    }
  },
  { 
    ...products[2], 
    quantity: 2,
    customizations: {
      cutType: "مقطع ريش",
      packaging: "تغليف مفرغ من الهواء",
      notes: ""
    }
  },
];

export default function Cart() {
  const [cartItems, setCartItems] = useState(initialCartItems);
  const [expandedItems, setExpandedItems] = useState<number[]>([]);

  const toggleDetails = (id: number) => {
    setExpandedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const updateQuantity = (id: number, delta: number) => {
    setCartItems(items => items.map(item => {
      if (item.id === id) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const removeItem = (id: number) => {
    setCartItems(items => items.filter(item => item.id !== id));
  };

  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const deliveryFee = 25;
  const total = subtotal + deliveryFee;

  return (
    <div className="min-h-screen bg-muted/10 pb-24 md:pb-0">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 font-heading">سلة المشتريات</h1>

        {cartItems.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => {
                const isExpanded = expandedItems.includes(item.id);
                return (
                  <Card key={item.id} className="overflow-hidden border-none shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex gap-4 items-center">
                        <div className="h-20 w-20 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                          <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-foreground truncate">{item.name}</h3>
                          <p className="text-primary font-bold">{item.price} ر.س</p>
                          <Button 
                            variant="link" 
                            className="h-auto p-0 text-xs text-muted-foreground hover:text-primary"
                            onClick={() => toggleDetails(item.id)}
                          >
                            تفاصيل التخصيص
                            {isExpanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                          </Button>
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
                      </div>
                      
                      {isExpanded && item.customizations && (
                        <div className="mt-4 pt-4 border-t bg-muted/30 rounded-lg p-3 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">طريقة التقطيع:</span>
                            <span className="font-medium">{item.customizations.cutType}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">التغليف:</span>
                            <span className="font-medium">{item.customizations.packaging}</span>
                          </div>
                          {item.customizations.notes && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">ملاحظات:</span>
                              <span className="font-medium">{item.customizations.notes}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
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

                  <Button className="w-full mt-6 h-12 text-lg font-bold shadow-lg" size="lg">
                    إتمام الشراء
                    <CreditCard className="mr-2 h-5 w-5" />
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
    </div>
  );
}

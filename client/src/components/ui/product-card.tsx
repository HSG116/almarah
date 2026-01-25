import { products } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Minus, ShoppingCart, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface ProductCardProps {
  product: typeof products[0];
}

const CUTTING_METHODS = [
  { id: "fridge", label: "ثلاجة" },
  { id: "large", label: "تفصيل كبير" },
  { id: "small", label: "تفصيل صغير" },
];

export function ProductCard({ product }: ProductCardProps) {
  const [quantity, setQuantity] = useState(1);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [selectedCutting, setSelectedCutting] = useState("fridge");
  
  const { toast } = useToast();

  const increment = () => setQuantity(q => q + 1);
  const decrement = () => setQuantity(q => Math.max(1, q - 1));

  const handleAddToCart = () => {
    toast({
      title: "تمت الإضافة للسلة",
      description: `تم إضافة ${quantity} من ${product.name} بنجاح`,
      className: "bg-primary text-primary-foreground border-none text-right"
    });
    setIsOptionsOpen(false);
  };

  return (
    <Card className="overflow-hidden border-none shadow-sm hover:shadow-lg transition-all duration-300 group rounded-3xl bg-white">
      <Dialog open={isOptionsOpen} onOpenChange={setIsOptionsOpen}>
        <DialogTrigger asChild>
          <div className="cursor-pointer">
            <div className="relative aspect-[4/3] overflow-hidden">
              <img 
                src={product.image} 
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {product.discount && (
                <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                  خصم {product.discount}%
                </div>
              )}
            </div>
            
            <CardContent className="p-0 -mt-6 relative z-10">
              <div className="bg-white rounded-t-[2rem] p-6 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] text-center">
                <h3 className="font-bold text-xl text-gray-800 mb-1">{product.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">يبدأ السعر من</p>
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-black text-gray-900 flex items-center gap-1">
                    {product.price.toFixed(2)} 
                    <img src="/images/currency-icon.png" className="h-6 w-auto" alt="ر.س" />
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-1">شامل ضريبة القيمة المضافة 15%</p>
                </div>
              </div>
            </CardContent>
          </div>
        </DialogTrigger>

        <DialogContent className="sm:max-w-[400px] rounded-none p-0 overflow-y-auto h-full max-h-screen border-none no-scrollbar fixed inset-0 translate-x-0 translate-y-0 left-0 top-0" dir="rtl">
          <div className="relative h-64 shrink-0">
            <img src={product.image} className="w-full h-full object-cover" alt="" />
            <div className="absolute inset-0 bg-black/20" />
          </div>

          <div className="p-6 -mt-10 relative z-10 bg-white rounded-t-[2.5rem]">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800">{product.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">يبدأ السعر من</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <p className="text-2xl font-black text-gray-900">{product.price.toFixed(2)}</p>
                <img src="/images/currency-icon.png" className="h-6 w-auto" alt="ر.س" />
              </div>
              <p className="text-[10px] text-muted-foreground italic">شامل ضريبة القيمة المضافة 15%</p>
            </div>

            <p className="text-sm text-center text-gray-500 mb-8 px-4 leading-relaxed">
              أجود أنواع النعيمي (16 - 18 كيلو)، يذبح ويحضر في معامل طازج حسب طلبك ليصلك طازج
            </p>

            <div className="flex items-center justify-between mb-8 px-2">
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" size="icon" 
                  className="h-10 w-10 rounded-xl border-green-700 text-green-700 hover:bg-green-50"
                  onClick={increment}
                >
                  <Plus className="h-5 w-5" />
                </Button>
                <span className="font-bold text-xl min-w-[20px] text-center">{quantity}</span>
                <Button 
                  variant="outline" size="icon" 
                  className="h-10 w-10 rounded-xl border-green-700 text-green-700 hover:bg-green-50"
                  onClick={decrement}
                >
                  <Minus className="h-5 w-5" />
                </Button>
              </div>
              <div className="text-left flex items-center gap-1">
                <p className="text-2xl font-black text-gray-900">{ (product.price * quantity).toFixed(2) }</p>
                <img src="/images/currency-icon.png" className="h-6 w-auto" alt="ر.س" />
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="border rounded-2xl overflow-hidden">
                <div className="bg-gray-50 p-4 flex justify-between items-center border-b">
                  <span className="font-bold text-gray-700">أنواع التقطيع</span>
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                </div>
                <div className="p-4">
                  <RadioGroup 
                    value={selectedCutting} 
                    onValueChange={setSelectedCutting} 
                    className="flex flex-wrap gap-6 justify-center"
                  >
                    {CUTTING_METHODS.map((method) => (
                      <div key={method.id} className="flex items-center gap-2">
                        <RadioGroupItem value={method.id} id={`cut-${method.id}`} className="border-gray-300 text-green-700" />
                        <Label htmlFor={`cut-${method.id}`} className="font-bold text-gray-700 cursor-pointer">{method.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                className="flex-1 bg-green-700 hover:bg-green-800 text-white rounded-2xl h-14 text-lg font-bold shadow-lg"
                onClick={handleAddToCart}
              >
                أضف للسلة
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 border-green-700 text-green-700 hover:bg-green-50 rounded-2xl h-14 text-lg font-bold"
                onClick={() => setIsOptionsOpen(false)}
              >
                أكمل التسوق
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}


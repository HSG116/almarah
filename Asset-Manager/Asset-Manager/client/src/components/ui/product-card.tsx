import { products } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Plus, Minus, ShoppingCart, Settings2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

interface ProductCardProps {
  product: typeof products[0];
}

const CUTTING_METHODS = [
  { id: "fridge", label: "تقطيع ثلاجة (أوصال)" },
  { id: "small", label: "تقطيع صغير (مرق)" },
  { id: "quarters", label: "تقطيع أرباع" },
  { id: "half", label: "تقطيع أنصاف" },
  { id: "whole", label: "بدون تقطيع (كامل)" },
];

const PACKAGING_METHODS = [
  { id: "plates", label: "تغليف أطباق (فلين)" },
  { id: "bags", label: "تغليف أكياس" },
  { id: "vacuum", label: "تغليف سحب هواء (Vacuum)" },
  { id: "boxes", label: "تغليف كرتون" },
  { id: "none", label: "بدون تغليف خاص" },
];

const SPECIAL_REQUESTS = [
  { id: "no-tripe", label: "بدون كرشة" },
  { id: "no-head", label: "بدون رأس" },
  { id: "no-feet", label: "بدون كوارع" },
  { id: "extra-fat", label: "زيادة شحم" },
  { id: "no-fat", label: "بدون شحم" },
];

export function ProductCard({ product }: ProductCardProps) {
  const [quantity, setQuantity] = useState(1);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [selectedCutting, setSelectedCutting] = useState("fridge");
  const [selectedPackaging, setSelectedPackaging] = useState("plates");
  const [specials, setSpecials] = useState<string[]>([]);
  
  const { toast } = useToast();

  const increment = () => setQuantity(q => q + 1);
  const decrement = () => setQuantity(q => Math.max(1, q - 1));

  const handleAddToCart = () => {
    toast({
      title: "تمت الإضافة للسلة",
      description: `تم إضافة ${quantity} ${product.unit} من ${product.name} مع الخيارات المختارة بنجاح`,
      className: "bg-primary text-primary-foreground border-none"
    });
    setIsOptionsOpen(false);
  };

  const toggleSpecial = (id: string) => {
    setSpecials(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  return (
    <Card className="overflow-hidden border-none shadow-sm hover:shadow-lg transition-all duration-300 group rounded-2xl bg-card">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {product.discount && (
          <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
            خصم {product.discount}%
          </div>
        )}
      </div>
      
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-lg text-foreground line-clamp-1">{product.name}</h3>
          <span className="font-bold text-primary whitespace-nowrap">
            {product.price} ر.س <span className="text-xs text-muted-foreground font-normal">/{product.unit}</span>
          </span>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10">
          {product.description}
        </p>
        
        <div className="flex items-center justify-between gap-3 bg-secondary/30 p-1 rounded-xl">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-lg hover:bg-background text-primary"
            onClick={decrement}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="font-bold w-4 text-center text-sm">{quantity}</span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-lg hover:bg-background text-primary"
            onClick={increment}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0">
        <Dialog open={isOptionsOpen} onOpenChange={setIsOptionsOpen}>
          <DialogTrigger asChild>
            <Button 
              className="w-full rounded-xl font-bold shadow-md hover:shadow-xl transition-all" 
            >
              <ShoppingCart className="ml-2 h-4 w-4" />
              أضف للسلة
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-3xl" dir="rtl">
            <DialogHeader className="text-right">
              <DialogTitle className="text-xl font-bold font-heading">تخصيص الطلب</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                اختر طريقة التقطيع والتغليف المناسبة لك
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4 max-h-[60vh] overflow-y-auto no-scrollbar px-1">
              {/* Cutting Method */}
              <div className="space-y-3">
                <Label className="text-base font-bold flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-primary" />
                  طريقة التقطيع
                </Label>
                <RadioGroup value={selectedCutting} onValueChange={setSelectedCutting} className="grid grid-cols-1 gap-2">
                  {CUTTING_METHODS.map((method) => (
                    <div key={method.id} className="flex items-center gap-3 border p-4 rounded-xl hover:bg-secondary/10 cursor-pointer transition-colors group/item w-full">
                      <RadioGroupItem value={method.id} id={`cut-${method.id}`} className="shrink-0" />
                      <Label htmlFor={`cut-${method.id}`} className="flex-1 cursor-pointer font-medium leading-none py-1 text-right">{method.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Packaging Method */}
              <div className="space-y-3">
                <Label className="text-base font-bold flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-primary" />
                  طريقة التغليف
                </Label>
                <RadioGroup value={selectedPackaging} onValueChange={setSelectedPackaging} className="grid grid-cols-1 gap-2">
                  {PACKAGING_METHODS.map((method) => (
                    <div key={method.id} className="flex items-center gap-3 border p-4 rounded-xl hover:bg-secondary/10 cursor-pointer transition-colors group/item w-full">
                      <RadioGroupItem value={method.id} id={`pack-${method.id}`} className="shrink-0" />
                      <Label htmlFor={`pack-${method.id}`} className="flex-1 cursor-pointer font-medium leading-none py-1 text-right">{method.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Special Requests */}
              <div className="space-y-3">
                <Label className="text-base font-bold flex items-center gap-2">
                  ✨ خيارات إضافية
                </Label>
                <div className="grid grid-cols-1 gap-2">
                  {SPECIAL_REQUESTS.map((req) => (
                    <div key={req.id} className="flex items-center gap-3 border p-4 rounded-xl hover:bg-secondary/10 cursor-pointer transition-colors group/item w-full">
                      <Checkbox 
                        id={`special-${req.id}`} 
                        checked={specials.includes(req.id)}
                        onCheckedChange={() => toggleSpecial(req.id)}
                        className="shrink-0"
                      />
                      <Label htmlFor={`special-${req.id}`} className="flex-1 cursor-pointer font-medium leading-none py-1 text-right">{req.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="sm:justify-start">
              <Button type="button" className="w-full rounded-xl font-bold h-12 text-lg" onClick={handleAddToCart}>
                تأكيد وإضافة للسلة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}

import { products } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Minus, ShoppingCart, ChevronDown, ChevronRight, ChevronLeft } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";

interface ProductCardProps {
  product: typeof products[0];
}

const CUTTING_METHODS = [
  { id: "fridge", label: "ثلاجة" },
  { id: "large", label: "تفصيل كبير" },
  { id: "small", label: "تفصيل صغير" },
  { id: "quarters", label: "أرباع" },
  { id: "half", label: "أنصاف" },
];

const PACKAGING_METHODS = [
  { id: "plates", label: "أطباق" },
  { id: "bags", label: "أكياس" },
  { id: "vacuum", label: "سحب هواء" },
];

export function ProductCard({ product }: ProductCardProps) {
  const categoryProducts = products.filter(p => p.category === product.category);
  const [activeProduct, setActiveProduct] = useState(product);
  const currentIndex = categoryProducts.findIndex(p => p.id === activeProduct.id);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    const prevIndex = (currentIndex - 1 + categoryProducts.length) % categoryProducts.length;
    setActiveProduct(categoryProducts[prevIndex]);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextIndex = (currentIndex + 1) % categoryProducts.length;
    setActiveProduct(categoryProducts[nextIndex]);
  };

  const [quantity, setQuantity] = useState(1);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [selectedCutting, setSelectedCutting] = useState("fridge");
  const [selectedPackaging, setSelectedPackaging] = useState("plates");
  const [note, setNote] = useState("");
  const [openSections, setOpenSections] = useState<string[]>(["cutting", "packaging", "notes"]);

  const toggleSection = (id: string) => {
    setOpenSections(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };
  
  const { toast } = useToast();

  const increment = () => setQuantity(q => q + 1);
  const decrement = () => setQuantity(q => Math.max(1, q - 1));

  const handleAddToCart = () => {
    toast({
      title: "تمت الإضافة للسلة",
      description: `تم إضافة ${quantity} من ${activeProduct.name} بنجاح`,
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
                src={activeProduct.image} 
                alt={activeProduct.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              {activeProduct.badge && (
                <div className={`absolute top-4 right-4 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg z-20 ${
                  activeProduct.badge === 'وفر المال' ? 'bg-orange-500' : 'bg-green-600'
                }`}>
                  {activeProduct.badge}
                </div>
              )}
              
              {/* Navigation Arrows for Mobile & Desktop */}
              <div className="absolute inset-0 flex items-center justify-between px-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-30 pointer-events-none">
                <Button 
                  variant="secondary" size="icon" 
                  className="h-8 w-8 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white text-primary pointer-events-auto"
                  onClick={handleNext}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button 
                  variant="secondary" size="icon" 
                  className="h-8 w-8 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white text-primary pointer-events-auto"
                  onClick={handlePrev}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <CardContent className="p-0 -mt-8 relative z-10">
              <div className="bg-white rounded-t-[2.5rem] p-6 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] text-center border-x border-t border-gray-50">
                <h3 className="font-bold text-lg text-gray-800 mb-2 group-hover:text-green-700 transition-colors">{activeProduct.name}</h3>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl font-black text-gray-900 flex items-center gap-1">
                    <img src="/images/currency-icon.png" className="h-5 w-auto" alt="ر.س" />
                    {activeProduct.price.toFixed(2)}
                  </span>
                  <span className="text-xs font-medium text-gray-500 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                    الحجم: {activeProduct.size} ({activeProduct.weight})
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-1">شامل ضريبة القيمة المضافة 15%</p>
                </div>
                
                {/* Product Navigation Below Details */}
                <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-50">
                  <Button 
                    variant="ghost" size="icon" 
                    className="h-8 w-8 rounded-full text-primary hover:bg-green-50"
                    onClick={handleNext}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                  <span className="text-xs font-medium text-gray-400">
                    {currentIndex + 1} / {categoryProducts.length}
                  </span>
                  <Button 
                    variant="ghost" size="icon" 
                    className="h-8 w-8 rounded-full text-primary hover:bg-green-50"
                    onClick={handlePrev}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </div>
        </DialogTrigger>

        <DialogContent className="sm:max-w-[400px] rounded-none p-0 overflow-y-auto h-full max-h-screen border-none no-scrollbar fixed inset-0 translate-x-0 translate-y-0 left-0 top-0" dir="rtl">
          <div className="relative h-64 shrink-0">
            <img src={activeProduct.image} className="w-full h-full object-cover" alt="" />
            <div className="absolute inset-0 bg-black/20" />
            
            {/* Modal Navigation */}
            <div className="absolute inset-0 flex items-center justify-between px-4 z-20 pointer-events-none">
              <Button 
                variant="secondary" size="icon" 
                className="h-10 w-10 rounded-full bg-white/80 backdrop-blur-sm shadow-lg hover:bg-white text-primary pointer-events-auto"
                onClick={handleNext}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
              <Button 
                variant="secondary" size="icon" 
                className="h-10 w-10 rounded-full bg-white/80 backdrop-blur-sm shadow-lg hover:bg-white text-primary pointer-events-auto"
                onClick={handlePrev}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
            </div>
          </div>

          <div className="p-6 -mt-10 relative z-10 bg-white rounded-t-[2.5rem]">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800">{activeProduct.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">يبدأ السعر من</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <p className="text-2xl font-black text-gray-900">{activeProduct.price.toFixed(2)}</p>
                <img src="/images/currency-icon.png" className="h-6 w-auto" alt="ر.س" />
              </div>
              <p className="text-[10px] text-muted-foreground italic">شامل ضريبة القيمة المضافة 15%</p>
            </div>

            <p className="text-sm text-center text-gray-500 mb-8 px-4 leading-relaxed">
              {activeProduct.description || "أجود أنواع اللحوم البلدية المختارة بعناية، تذبح وتحضر طازجة يومياً حسب طلبك لتصلك بأفضل جودة."}
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
                <p className="text-2xl font-black text-gray-900">{ (activeProduct.price * quantity).toFixed(2) }</p>
                <img src="/images/currency-icon.png" className="h-6 w-auto" alt="ر.س" />
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="border rounded-2xl overflow-hidden">
                <button 
                  onClick={() => toggleSection("cutting")}
                  className="w-full bg-gray-50 p-4 flex justify-between items-center border-b hover:bg-gray-100 transition-colors"
                >
                  <span className="font-bold text-gray-700">أنواع التتقطيع</span>
                  <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${openSections.includes("cutting") ? "rotate-180" : ""}`} />
                </button>
                {openSections.includes("cutting") && (
                  <div className="p-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    <RadioGroup 
                      value={selectedCutting} 
                      onValueChange={setSelectedCutting} 
                      className="flex flex-wrap gap-4 justify-center"
                    >
                      {CUTTING_METHODS.map((method) => (
                        <div key={method.id} className="flex items-center gap-2">
                          <RadioGroupItem value={method.id} id={`cut-${method.id}`} className="border-gray-300 text-green-700" />
                          <Label htmlFor={`cut-${method.id}`} className="font-bold text-gray-700 cursor-pointer">{method.label}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}
              </div>

              <div className="border rounded-2xl overflow-hidden">
                <button 
                  onClick={() => toggleSection("packaging")}
                  className="w-full bg-gray-50 p-4 flex justify-between items-center border-b hover:bg-gray-100 transition-colors"
                >
                  <span className="font-bold text-gray-700">نوع التغليف</span>
                  <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${openSections.includes("packaging") ? "rotate-180" : ""}`} />
                </button>
                {openSections.includes("packaging") && (
                  <div className="p-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    <RadioGroup 
                      value={selectedPackaging} 
                      onValueChange={setSelectedPackaging} 
                      className="flex flex-wrap gap-4 justify-center"
                    >
                      {PACKAGING_METHODS.map((method) => (
                        <div key={method.id} className="flex items-center gap-2">
                          <RadioGroupItem value={method.id} id={`pack-${method.id}`} className="border-gray-300 text-green-700" />
                          <Label htmlFor={`pack-${method.id}`} className="font-bold text-gray-700 cursor-pointer">{method.label}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}
              </div>

              <div className="border rounded-2xl overflow-hidden">
                <button 
                  onClick={() => toggleSection("notes")}
                  className="w-full bg-gray-50 p-4 flex justify-between items-center border-b hover:bg-gray-100 transition-colors"
                >
                  <span className="font-bold text-gray-700">ملاحظات إضافية</span>
                  <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${openSections.includes("notes") ? "rotate-180" : ""}`} />
                </button>
                {openSections.includes("notes") && (
                  <div className="p-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    <Textarea 
                      placeholder="اكتب أي ملاحظات إضافية هنا (مثلاً: بدون رأس، زيادة شحم...)"
                      className="min-h-[100px] rounded-xl border-gray-200 focus:border-green-700 resize-none"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </div>
                )}
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


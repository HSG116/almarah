import { type Product } from "@shared/schema";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Minus, ShoppingCart, ChevronDown, ChevronRight, ChevronLeft, Maximize2, X } from "lucide-react";
import { useState, useEffect } from "react";
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
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { type ProductAttribute } from "@shared/schema";

interface ProductCardProps {
  product: Product;
  relatedProducts?: Product[];
  showNavigation?: boolean;
  showArrows?: boolean;
}

// Methods will be fetched from database
const DEFAULT_CUTTING_METHODS = [
  { id: "fridge", label: "ثلاجة" },
  { id: "large", label: "تفصيل كبير" },
];

const DEFAULT_PACKAGING_METHODS = [
  { id: "plates", label: "أطباق" },
  { id: "bags", label: "أكياس" },
];

export function ProductCard({ product, relatedProducts = [], showNavigation = false, showArrows = false }: ProductCardProps) {
  const categoryProducts = relatedProducts.length > 0 ? relatedProducts : [product];
  const [activeProduct, setActiveProduct] = useState<Product>(product);
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
  const [selectedCutting, setSelectedCutting] = useState("");
  const [selectedPackaging, setSelectedPackaging] = useState("");
  const [selectedExtra, setSelectedExtra] = useState("");
  const [note, setNote] = useState("");
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [isZoomed, setIsZoomed] = useState(false);

  // Fetch dynamic attributes from DB
  const { data: attributes = [] } = useQuery<ProductAttribute[]>({
    queryKey: ['product_attributes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('product_attributes').select('*').eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: isOptionsOpen // Only fetch when dialog opens
  });

  const cuttingMethods = attributes.filter(a => a.type === 'cutting');
  const packagingMethods = attributes.filter(a => a.type === 'packaging');
  const extraMethods = attributes.filter(a => a.type === 'extra');

  // Set defaults when attributes load
  useEffect(() => {
    if (isOptionsOpen && attributes.length > 0) {
      if (!selectedCutting && cuttingMethods.length > 0) setSelectedCutting(cuttingMethods[0].name);
      if (!selectedPackaging && packagingMethods.length > 0) setSelectedPackaging(packagingMethods[0].name);
      if (!selectedExtra && extraMethods.length > 0) setSelectedExtra(extraMethods[0].name);
    }
  }, [isOptionsOpen, attributes]);

  const toggleSection = (id: string) => {
    setOpenSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const { addItem } = useCart();
  const { toast } = useToast();

  const increment = () => setQuantity(q => q + 1);
  const decrement = () => setQuantity(q => Math.max(1, q - 1));

  const handleAddToCart = () => {
    addItem(activeProduct, quantity, {
      cutting: selectedCutting,
      packaging: selectedPackaging,
      extras: selectedExtra,
      notes: note
    });
    setIsOptionsOpen(false);
    toast({
      title: "تمت الإضافة للسلة",
      description: `${quantity} x ${activeProduct.name}`,
    });
  };

  return (
    <Card className="overflow-hidden border-none shadow-sm hover:shadow-lg transition-all duration-300 group rounded-3xl bg-white">
      <Dialog open={isOptionsOpen} onOpenChange={setIsOptionsOpen}>
        <DialogTrigger asChild>
          <div className="cursor-pointer">
            <div className="relative aspect-square md:aspect-[4/3] overflow-hidden">
              <img
                src={activeProduct.image}
                alt={activeProduct.name}
                className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${activeProduct.imageObjectPosition || 'object-center'}`}
              />
              {activeProduct.badge && (
                <div className={`absolute top-2 right-2 md:top-4 md:right-4 text-white text-[10px] md:text-xs font-bold px-2 py-1 md:px-3 md:py-1.5 rounded-full shadow-lg z-20 ${activeProduct.badge === 'وفر المال' ? 'bg-orange-500' : 'bg-green-600'
                  }`}>
                  {activeProduct.badge}
                </div>
              )}

              {/* Navigation Arrows for Mobile & Desktop - Only show in home page */}
              {showArrows && (
                <div className="absolute inset-0 flex items-center justify-between px-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-30 pointer-events-none">
                  <Button
                    variant="secondary" size="icon"
                    className="h-6 w-6 md:h-8 md:w-8 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white text-primary pointer-events-auto border-0 outline-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    onClick={handleNext}
                  >
                    <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                  <Button
                    variant="secondary" size="icon"
                    className="h-6 w-6 md:h-8 md:w-8 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white text-primary pointer-events-auto border-0 outline-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    onClick={handlePrev}
                  >
                    <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                </div>
              )}
            </div>

            <CardContent className="p-0 -mt-6 md:-mt-8 relative z-10">
              <div className="bg-white rounded-t-[1.5rem] md:rounded-t-[2.5rem] p-3 md:p-6 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] text-center border-x border-t border-gray-50 h-[140px] md:h-auto flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-sm md:text-lg text-gray-800 mb-1 group-hover:text-green-700 transition-colors line-clamp-1">{activeProduct.name}</h3>
                  <div className="flex flex-col items-center gap-0.5 md:gap-1">
                    <span className="text-lg md:text-2xl font-black text-gray-900 flex items-center gap-1">
                      {activeProduct.price.toFixed(0)}
                      <span className="text-xs md:text-sm text-gray-500 font-normal">ر.س</span>
                    </span>
                    <span className="text-[10px] md:text-xs font-medium text-gray-500">
                      /{activeProduct.unit}
                    </span>
                  </div>
                </div>

                <Button
                  size="sm"
                  className="w-full bg-green-700 hover:bg-green-800 text-white rounded-xl h-8 md:h-10 text-xs md:text-sm font-bold shadow-md shadow-green-700/20 mt-2"
                >
                  أضف
                  <ShoppingCart className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                </Button>
              </div>
            </CardContent>
          </div>
        </DialogTrigger>

        <DialogContent className="sm:max-w-[420px] md:max-w-5xl rounded-none md:rounded-[2.5rem] p-0 overflow-hidden max-h-[95vh] border-none bg-white gap-0 focus:outline-none" dir="rtl">
          <div className="flex flex-col md:flex-row h-full max-h-[95vh] overflow-hidden bg-white">

            {/* Image Section (Right Side on RTL Desktop) - Sticky on Desktop */}
            <div className="relative h-[280px] md:h-auto md:w-[45%] shrink-0 bg-gray-50 flex items-center justify-center overflow-hidden">
              <img src={activeProduct.image} className="w-full h-full object-cover" alt={activeProduct.name} />

              {/* Product Badge */}
              {activeProduct.badge && (
                <div className={`absolute top-6 right-6 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg z-20 ${activeProduct.badge === 'وفر المال' ? 'bg-orange-500' : 'bg-green-600'
                  }`}>
                  {activeProduct.badge}
                </div>
              )}

              {/* Zoom Button */}
              <Button
                size="icon"
                className="absolute bottom-6 left-6 z-30 rounded-full bg-white/80 hover:bg-white text-gray-800 shadow-lg border-none h-10 w-10 backdrop-blur-md transition-all hover:scale-110"
                onClick={() => setIsZoomed(true)}
              >
                <Maximize2 className="h-5 w-5" />
              </Button>
            </div>

            {/* Content Section */}
            <div className="md:w-[55%] flex flex-col h-full overflow-hidden bg-white">
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 scrollbar-hide">

                {/* Header */}
                <div className="space-y-4 text-center md:text-right">
                  <h3 className="text-2xl md:text-4xl font-bold text-gray-900 font-heading">{activeProduct.name}</h3>

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div>
                      <span className="text-sm text-gray-500 block mb-1">السعر الحالي</span>
                      <div className="flex items-center justify-center md:justify-start gap-1">
                        <span className="text-3xl md:text-4xl font-black text-green-700">{activeProduct.price.toFixed(2)}</span>
                        <img src="/images/currency-icon.png" className="h-6 w-auto opacity-70" alt="ر.س" />
                      </div>
                    </div>
                    <div className="h-px w-full md:w-px md:h-12 bg-gray-200"></div>
                    <div className="flex items-center gap-2 justify-center md:justify-start">
                      <span className="text-sm font-medium text-gray-500">الوحدة:</span>
                      <span className="text-base font-bold text-gray-800 bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-sm">{activeProduct.unit}</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                  <p className="text-gray-600 leading-relaxed text-center md:text-right">
                    {activeProduct.description || "أجود أنواع اللحوم البلدية المختارة بعناية، تذبح وتحضر طازجة يومياً حسب طلبك لتصلك بأفضل جودة ومذاق لا يقاوم."}
                  </p>
                </div>

                {/* Options */}
                <div className="space-y-3">
                  {/* Cutting Options */}
                  {activeProduct.hasCutting && cuttingMethods.length > 0 && (
                    <div className="border border-gray-200 rounded-2xl overflow-hidden transition-all hover:border-green-200 hover:shadow-sm">
                      <button
                        onClick={() => toggleSection("cutting")}
                        className="w-full bg-white p-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-bold text-gray-700 flex items-center gap-2">🔪 أنواع التقطيع</span>
                        <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${openSections.includes("cutting") ? "rotate-180" : ""}`} />
                      </button>
                      {openSections.includes("cutting") && (
                        <div className="p-4 bg-gray-50/50 border-t border-gray-100 animate-in slide-in-from-top-2">
                          <RadioGroup value={selectedCutting} onValueChange={setSelectedCutting} className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {cuttingMethods.map((method) => (
                              <div key={method.id} className="relative">
                                <RadioGroupItem value={method.name} id={`cut-${method.id}`} className="peer sr-only" />
                                <Label htmlFor={`cut-${method.id}`} className="flex items-center justify-center p-2 rounded-xl border-2 border-transparent bg-white shadow-sm cursor-pointer hover:bg-gray-50 peer-data-[state=checked]:border-green-600 peer-data-[state=checked]:bg-green-50 peer-data-[state=checked]:text-green-700 transition-all font-medium text-sm text-center h-full w-full">{method.name}</Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Packaging Options */}
                  {activeProduct.hasPackaging && packagingMethods.length > 0 && (
                    <div className="border border-gray-200 rounded-2xl overflow-hidden transition-all hover:border-green-200 hover:shadow-sm">
                      <button
                        onClick={() => toggleSection("packaging")}
                        className="w-full bg-white p-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-bold text-gray-700 flex items-center gap-2">📦 نوع التغليف</span>
                        <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${openSections.includes("packaging") ? "rotate-180" : ""}`} />
                      </button>
                      {openSections.includes("packaging") && (
                        <div className="p-4 bg-gray-50/50 border-t border-gray-100 animate-in slide-in-from-top-2">
                          <RadioGroup value={selectedPackaging} onValueChange={setSelectedPackaging} className="grid grid-cols-3 gap-2">
                            {packagingMethods.map((method) => (
                              <div key={method.id} className="relative">
                                <RadioGroupItem value={method.name} id={`pack-${method.id}`} className="peer sr-only" />
                                <Label htmlFor={`pack-${method.id}`} className="flex items-center justify-center p-2 rounded-xl border-2 border-transparent bg-white shadow-sm cursor-pointer hover:bg-gray-50 peer-data-[state=checked]:border-green-600 peer-data-[state=checked]:bg-green-50 peer-data-[state=checked]:text-green-700 transition-all font-medium text-sm text-center h-full w-full">{method.name}</Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Extras Options */}
                  {activeProduct.hasExtras && extraMethods.length > 0 && (
                    <div className="border border-gray-200 rounded-2xl overflow-hidden transition-all hover:border-green-200 hover:shadow-sm">
                      <button
                        onClick={() => toggleSection("extras")}
                        className="w-full bg-white p-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-bold text-gray-700 flex items-center gap-2">✨ إضافات خاصة</span>
                        <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${openSections.includes("extras") ? "rotate-180" : ""}`} />
                      </button>
                      {openSections.includes("extras") && (
                        <div className="p-4 bg-gray-50/50 border-t border-gray-100 animate-in slide-in-from-top-2">
                          <RadioGroup value={selectedExtra} onValueChange={setSelectedExtra} className="grid grid-cols-2 gap-2">
                            {extraMethods.map((method) => (
                              <div key={method.id} className="relative">
                                <RadioGroupItem value={method.name} id={`extra-${method.id}`} className="peer sr-only" />
                                <Label htmlFor={`extra-${method.id}`} className="flex items-center justify-center p-2 rounded-xl border-2 border-transparent bg-white shadow-sm cursor-pointer hover:bg-gray-50 peer-data-[state=checked]:border-green-600 peer-data-[state=checked]:bg-green-50 peer-data-[state=checked]:text-green-700 transition-all font-medium text-sm text-center h-full w-full">{method.name}</Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  <div className="border border-gray-200 rounded-2xl overflow-hidden transition-all hover:border-green-200 hover:shadow-sm">
                    <button
                      onClick={() => toggleSection("notes")}
                      className="w-full bg-white p-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-bold text-gray-700 flex items-center gap-2">📝 ملاحظات</span>
                      <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${openSections.includes("notes") ? "rotate-180" : ""}`} />
                    </button>
                    {openSections.includes("notes") && (
                      <div className="p-4 bg-gray-50/50 border-t border-gray-100 animate-in slide-in-from-top-2">
                        <Textarea
                          placeholder="اكتب ملاحظاتك هنا..."
                          className="min-h-[80px] rounded-xl border-gray-200 focus:border-green-700 focus:ring-green-700/20 bg-white resize-none"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer / Actions - Sticky Bottom */}
              <div className="sticky bottom-0 p-4 md:p-6 bg-white border-t border-gray-100 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-20">
                <div className="flex flex-col gap-4">

                  {/* Row 1: Quantity Counter (Centered) */}
                  <div className="flex justify-center w-full">
                    <div className="flex items-center bg-gray-50 p-1.5 rounded-2xl border border-gray-200 w-full md:w-auto justify-between md:justify-center">
                      <Button
                        variant="ghost" size="icon"
                        className="h-10 w-10 rounded-xl bg-white text-green-700 font-bold hover:bg-green-50 shadow-sm border border-gray-100"
                        onClick={increment}
                      >
                        <Plus className="h-5 w-5" />
                      </Button>
                      <span className="font-bold text-xl w-16 text-center text-gray-800">{quantity}</span>
                      <Button
                        variant="ghost" size="icon"
                        className="h-10 w-10 rounded-xl bg-white text-gray-500 font-bold hover:bg-red-50 hover:text-red-500 shadow-sm border border-gray-100"
                        onClick={decrement}
                      >
                        <Minus className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>

                  {/* Row 2: Action Buttons (Side by Side) */}
                  <div className="flex gap-3 w-full">
                    {/* Add to Cart - Primary */}
                    <Button
                      className="flex-[2] bg-green-700 hover:bg-green-800 text-white rounded-2xl h-14 text-base md:text-lg font-bold shadow-lg shadow-green-700/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-between px-6"
                      onClick={handleAddToCart}
                    >
                      <span>أضف للسلة</span>
                      <div className="bg-white/20 px-3 py-1 rounded-lg text-sm md:text-base">
                        {(activeProduct.price * quantity).toFixed(0)} ر.س
                      </div>
                    </Button>

                    {/* Continue Shopping - Secondary */}
                    <Button
                      variant="outline"
                      className="flex-1 h-14 rounded-2xl border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-bold text-sm md:text-base border-2 bg-white"
                      onClick={() => setIsOptionsOpen(false)}
                    >
                      أكمل التسوق
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Screen Image Zoom Modal */}
      <Dialog open={isZoomed} onOpenChange={setIsZoomed}>
        <DialogContent className="max-w-[95vw] h-[90vh] p-0 border-none bg-black/90 flex items-center justify-center">
          <div className="relative w-full h-full flex items-center justify-center">
            <Button
              size="icon"
              className="absolute top-4 right-4 z-50 rounded-full bg-white/10 hover:bg-white/20 text-white border-none h-10 w-10"
              onClick={() => setIsZoomed(false)}
            >
              <X className="h-6 w-6" />
            </Button>
            <img
              src={activeProduct.image}
              alt={activeProduct.name}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </Card >
  );
}


import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { ProductCard } from "@/components/ui/product-card";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import { type Product, type Category } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";

export default function Products() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: siteSettings = [] } = useQuery({
    queryKey: ["site_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from('site_settings').select('*');
      if (error) throw error;
      return data || [];
    }
  });

  const settingsMap = siteSettings.reduce((acc: any, curr: any) => {
    try {
      acc[curr.key] = JSON.parse(curr.value);
    } catch (e) {
      acc[curr.key] = curr.value;
    }
    return acc;
  }, {});

  const isStoreClosed = settingsMap.store_status === 'closed';

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return (data || [])
        .filter((p: any) => {
          const excludedProducts = [
            'حاشي لباني (بالكيلو)',
            'عجل بلدي رضيع (بالكيلو)',
            'بقدونس',
            'الكزبرة',
            'كزبرة',
            'نعناع',
            'جرجير',
            'زهرة (قرنبيط)',
            'ملفوف (كرنب)'
          ];
          return !excludedProducts.includes(p.name) && p.is_active !== false;
        })
        .map((p: any) => {
          // تصحيح مؤقت: تعيين موضع الصورة للمنتجات المحددة
          let imagePos = p.image_object_position;
          if (p.name === 'خروف حري كامل' || p.name === 'تيس بلدي محايل') {
            imagePos = 'object-top';
          }

          return {
            ...p,
            categoryId: p.category_id,
            isFeatured: p.is_featured,
            isActive: p.is_active !== false,
            imageObjectPosition: imagePos
          };
        }).concat([
          // Inject missing products if they don't exist yet
          !data.find((p: any) => p.name === 'خروف نعيمي متوسط') ? {
            id: 998, // Temp ID
            name: 'خروف نعيمي متوسط',
            price: 1200.00,
            unit: 'ذبيحة',
            image: '/images/lamb/خروف نعيمي متوسط.png',
            description: 'خروف نعيمي بلدي حجم متوسط، مثالي للعائلة الصغيرة.',
            categoryId: 'lamb',
            isFeatured: false,
            badge: null,
            size: 'متوسط',
            weight: '7-9 كجم',
            imageObjectPosition: null
          } : [],
          !data.find((p: any) => p.name === 'نعيمي لباني') ? {
            id: 999, // Temp ID
            name: 'نعيمي لباني',
            price: 900.00,
            unit: 'ذبيحة',
            image: '/images/lamb/نعيمي لباني.png',
            description: 'خروف نعيمي صغير (لباني)، لحم طري جداً ولذيذ.',
            categoryId: 'lamb',
            isFeatured: true,
            badge: 'لباني',
            size: 'صغير',
            weight: '5-7 كجم',
            imageObjectPosition: null
          } : []
        ].flat()) as Product[];
    }
  });
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*');
      if (error) throw error;
      // Mock default categories if DB is empty from SQL script for initial view
      if (!data || data.length === 0) {
        return [
          { id: 'all', name: 'الكل', icon: '🍽️', image: '' },
          { id: 'lamb', name: 'نعيمي', icon: '🐑', image: '/assets/category-lamb.png' },
          { id: 'beef', name: 'عجل', icon: '🐄', image: '/assets/category-beef.png' },
          { id: 'chicken', name: 'دواجن', icon: '🐔', image: '/assets/category-chicken.png' },
        ] as Category[];
      }
      return [{ id: 'all', name: 'الكل', icon: '🍽️' }, ...data] as Category[];
    }
  });

  const filteredProducts = products.filter(product => {
    const matchesCategory = activeCategory === 'all' || product.categoryId === activeCategory;
    const matchesSearch = product.name.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  const isLoading = productsLoading || categoriesLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/10 pb-20 md:pb-0">
        <Navbar />
        <div className="container mx-auto px-4 py-8 space-y-8">
          <Skeleton className="h-10 w-48" />
          <div className="flex gap-4">
            <Skeleton className="h-12 w-24 rounded-full" />
            <Skeleton className="h-12 w-24 rounded-full" />
            <Skeleton className="h-12 w-24 rounded-full" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={i} className="h-80 rounded-3xl" />)}
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-muted/10 pb-20 md:pb-0"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <Navbar />

      {isStoreClosed && (
        <div className="bg-rose-600 text-white py-4 px-6 text-center font-black animate-pulse z-[100] sticky top-0 shadow-lg flex items-center justify-center gap-3">
          <Search className="w-6 h-6 rotate-90" />
          <span className="text-lg">نعتذر، المتجر مغلق ولا يمكن استقبال طلبات حالياً.</span>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 font-heading">منتجاتنا</h1>

        {/* Mobile Search & Filter */}
        <div className="md:hidden flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث..."
              className="pr-10 rounded-xl bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-xl bg-white">
                <Filter className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl h-[60vh]">
              <SheetHeader>
                <SheetTitle>تصفية المنتجات</SheetTitle>
                <SheetDescription>اختر التصنيف المناسب</SheetDescription>
              </SheetHeader>
              <div className="grid grid-cols-2 gap-3 mt-6">
                {categories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={activeCategory === cat.id ? "default" : "outline"}
                    className="h-14 text-lg justify-start gap-3"
                    onClick={() => setActiveCategory(cat.id)}
                  >
                    <span>{cat.icon}</span>
                    {cat.name}
                  </Button>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop Categories */}
        <div className="hidden md:flex gap-3 overflow-x-auto pb-4 mb-8 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-full transition-all whitespace-nowrap border",
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground border-primary shadow-md transform scale-105"
                  : "bg-white text-muted-foreground border-transparent hover:bg-gray-50 hover:border-gray-200"
              )}
            >
              <span className="text-xl">{cat.icon}</span>
              <span className="font-bold">{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                relatedProducts={filteredProducts}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-20 text-muted-foreground">
              لا توجد منتجات مطابقة للبحث
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </motion.div>
  );
}

import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ui/product-card";
import { ArrowLeft, Clock, Truck, ShieldCheck, ChevronRight, ChevronLeft } from "lucide-react";
import { Link } from "wouter";
import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { type Product, type Category } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";

export default function Home() {
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
        .filter((p: any) => p.name !== 'حاشي لباني (بالكيلو)' && p.name !== 'عجل بلدي رضيع (بالكيلو)')
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
            isActive: p.is_active,
            hasCutting: p.has_cutting,
            hasPackaging: p.has_packaging,
            hasExtras: p.has_extras,
            imageObjectPosition: imagePos,
            stockQuantity: p.stock_quantity,
            isOutOfStock: p.is_out_of_stock
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
      // Mock default categories if DB is empty to prevent empty home page
      if (!data || data.length === 0) {
        return [
          { id: 'lamb', name: 'نعيمي', icon: '🐑', image: '/assets/category-lamb.png' },
          { id: 'beef', name: 'عجل', icon: '🐄', image: '/assets/category-beef.png' },
          { id: 'chicken', name: 'دواجن', icon: '🐔', image: '/assets/category-chicken.png' },
          { id: 'minced', name: 'مفروم', icon: '🥩', image: '/assets/category-minced.png' },
        ] as Category[];
      }
      return data as Category[];
    }
  });

  const featuredProducts = products.filter(p => p.isFeatured);
  const heroImage = "/images/lamb/حري.png";

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollRight(scrollLeft < 0);
      setCanScrollLeft(Math.abs(scrollLeft) < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      checkScroll();
      return () => el.removeEventListener('scroll', checkScroll);
    }
  }, [categories]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (productsLoading || categoriesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-full px-10">
          <Skeleton className="h-64 w-full rounded-3xl" />
          <div className="grid grid-cols-4 gap-4">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-background pb-20 md:pb-0"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <Navbar />

      {isStoreClosed && (
        <div className="bg-rose-600 text-white py-4 px-6 text-center font-black animate-pulse z-[100] sticky top-0 shadow-lg flex items-center justify-center gap-3">
          <Clock className="w-6 h-6 animate-spin-slow" />
          <span className="text-lg">عذراً، المحل مغلق حالياً. لا يمكن استقبال طلبات جديدة في الوقت الحالي.</span>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative h-[80vh] md:h-[600px] w-full overflow-hidden">
        <div className="absolute inset-0 bg-black/40 z-10" />
        <img
          src={heroImage}
          alt="Premium Meat"
          className="absolute inset-0 w-full h-full object-cover"
        />

        <div className="relative z-20 container mx-auto px-4 h-full flex flex-col justify-center items-start text-white rtl-grid">
          <div className="max-w-2xl animate-in slide-in-from-right duration-700">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 font-heading leading-tight">
              طعم الفخامة <br />
              <span className="text-secondary">في كل قطعة</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-200 font-light max-w-lg">
              أجود أنواع اللحوم الطازجة، ذبح يومي، تقطيع احترافي، وتوصيل سريع لباب منزلك.
            </p>
            <Link href="/products">
              <Button size="lg" className="text-lg px-8 py-6 rounded-full bg-primary hover:bg-primary/90 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 group">
                اطلب الآن
                <ArrowLeft className="mr-2 h-5 w-5 group-hover:-translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-10 md:py-16 bg-white container mx-auto px-4 -mt-12 relative z-30 rounded-t-[2.5rem] md:mt-0 md:rounded-none shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.1)]">
        <div className="relative group/nav">
          <div
            ref={scrollRef}
            className="flex md:grid md:grid-cols-3 gap-5 md:gap-8 overflow-x-auto no-scrollbar pb-6 md:pb-0 snap-x snap-mandatory"
          >
            {[
              { icon: Clock, title: "طازج يومياً", desc: "لحوم تذبح وتجهز يومياً لضمان الجودة" },
              { icon: ShieldCheck, title: "تقطيع حسب الطلب", desc: "اختر طريقة التقطيع التي تناسبك" },
              { icon: Truck, title: "توصيل سريع", desc: "سيارات مبردة تصلك في أسرع وقت" },
            ].map((feature, idx) => (
              <div key={idx} className="flex flex-col items-center text-center p-8 bg-gradient-to-b from-secondary/20 to-secondary/5 rounded-[2.5rem] border border-secondary/20 hover:border-primary/20 transition-all duration-500 min-w-[85vw] md:min-w-0 flex-shrink-0 snap-center shadow-sm hover:shadow-md">
                <div className="bg-white p-6 rounded-2xl shadow-sm mb-6 text-primary rotate-3 hover:rotate-0 transition-transform duration-300">
                  <feature.icon className="h-10 w-10" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-foreground font-heading">{feature.title}</h3>
                <p className="text-muted-foreground text-base leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* Navigation Arrows for Mobile */}
          <div className="md:hidden">
            {canScrollLeft && (
              <Button
                variant="secondary"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-40 rounded-full w-10 h-10 shadow-lg border border-white/50 bg-white/80 backdrop-blur-sm text-primary hover:bg-white"
                onClick={() => scroll('left')}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
            )}
            {canScrollRight && (
              <Button
                variant="secondary"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 z-40 rounded-full w-10 h-10 shadow-lg border border-white/50 bg-white/80 backdrop-blur-sm text-primary hover:bg-white"
                onClick={() => scroll('right')}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-3xl font-bold text-foreground font-heading border-r-4 border-primary pr-4">أقسامنا</h2>
            <Link href="/products">
              <Button variant="link" className="text-primary font-bold">عرض الكل</Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {categories.filter((c: Category) => c.id !== 'all').map((cat: Category) => (
              <Link key={cat.id} href={`/products?category=${cat.id}`}>
                <div className="group cursor-pointer relative overflow-hidden rounded-2xl aspect-square shadow-md hover:shadow-xl transition-all">
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors z-10" />
                  <img src={cat.image || ''} alt={cat.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-white">
                    <h3 className="text-2xl font-bold filter drop-shadow-md">{cat.name}</h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products (Our Exclusive Offers) */}
      <section className="py-16 container mx-auto px-4 bg-secondary/10 rounded-[3rem] my-10 border-2 border-primary/5">
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 text-center md:text-right">
          <div>
            <h2 className="text-4xl font-bold text-foreground font-heading mb-2">عروضنا الحصرية</h2>
            <p className="text-muted-foreground">بكسات متكاملة وعروض توفيرية تلبي احتياجاتك</p>
          </div>
          <Link href="/products">
            <Button variant="outline" className="mt-4 md:mt-0 border-primary text-primary hover:bg-primary hover:text-white rounded-full px-8">استكشف العروض</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* 1. Lamb Product - Using categoryId */}
          {products.filter(p => p.categoryId === 'lamb' && p.isFeatured).slice(0, 1).map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              relatedProducts={products.filter(p => p.categoryId === 'lamb')}
              showNavigation={true}
              showArrows={true}
            />
          ))}

          {/* 2. Vegetable Product - Using categoryId */}
          {products.filter(p => p.categoryId === 'veggies' && p.isFeatured).slice(0, 1).map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              relatedProducts={products.filter(p => p.categoryId === 'veggies')}
              showNavigation={true}
              showArrows={true}
            />
          ))}

          {/* 3. Chicken Product - Using categoryId */}
          {products.filter(p => p.categoryId === 'chicken' && p.isFeatured).slice(0, 1).map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              relatedProducts={products.filter(p => p.categoryId === 'chicken')}
              showNavigation={true}
              showArrows={true}
            />
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6 font-heading">جاهز لتجربة الطعم الأصلي؟</h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">سجل الآن واطلب ذبيحتك واصلة لباب بيتك، مقطعة ومغلفة بأحدث الطرق.</p>
          <Link href="/auth">
            <Button size="lg" variant="secondary" className="text-primary font-bold text-lg px-10 py-6 rounded-full shadow-lg hover:scale-105 transition-transform">
              سجل حساب جديد
            </Button>
          </Link>
        </div>
      </section>

      <BottomNav />
    </motion.div>
  );
}

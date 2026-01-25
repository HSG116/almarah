import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ui/product-card";
import { categories, products, heroImage } from "@/lib/mock-data";
import { ArrowLeft, Clock, Truck, ShieldCheck, ChevronRight, ChevronLeft } from "lucide-react";
import { Link } from "wouter";
import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function Home() {
  const featuredProducts = products.filter(p => p.isFeatured);
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
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <motion.div 
      className="min-h-screen bg-background pb-20 md:pb-0"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <Navbar />
      
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
              طعم الفخامة <br/>
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
            {categories.filter(c => c.id !== 'all').map((cat) => (
              <Link key={cat.id} href={`/products?category=${cat.id}`}>
                <div className="group cursor-pointer relative overflow-hidden rounded-2xl aspect-square shadow-md hover:shadow-xl transition-all">
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors z-10" />
                  <img src={cat.image} alt={cat.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-white">
                    <h3 className="text-2xl font-bold filter drop-shadow-md">{cat.name}</h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 container mx-auto px-4">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-3xl font-bold text-foreground font-heading border-r-4 border-primary pr-4">عروض مميزة</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
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

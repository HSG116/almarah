import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ui/product-card";
import { ArrowLeft, Clock, Truck, ShieldCheck, ChevronRight, ChevronLeft, Star } from "lucide-react";
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
        .map((p: any) => ({
          ...p,
          categoryId: p.category_id,
          isFeatured: p.is_featured,
          isActive: p.is_active,
          imageObjectPosition: p.image_object_position
        })) as Product[];
    }
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*');
      if (error) throw error;
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

  if (productsLoading || categoriesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-full px-10">
          <Skeleton className="h-[400px] w-full rounded-3xl" />
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
      className="min-h-screen bg-background pb-20 md:pb-0 font-sans"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Navbar />
      <MobileHeader />

      {isStoreClosed && (
        <div className="bg-rose-600 text-white py-3 px-6 text-center font-black animate-pulse z-[100] sticky top-0 md:top-[80px] shadow-lg flex items-center justify-center gap-3">
          <Clock className="w-5 h-5" />
          <span className="text-sm">عذراً، المحل مغلق حالياً. لا يمكن استقبال طلبات جديدة.</span>
        </div>
      )}

      {/* Hero Section - Luxurious Design */}
      <section className="relative h-[85vh] md:h-[650px] w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-l from-black/80 via-black/40 to-transparent z-10" />
        <img
          src="/images/lamb/حري.png"
          alt="Premium Meat"
          className="absolute inset-0 w-full h-full object-cover animate-scale-slow"
        />

        <div className="relative z-20 container mx-auto px-6 h-full flex flex-col justify-center items-start text-white">
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-2xl text-right md:text-right"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 backdrop-blur-md border border-primary/30 text-primary-foreground text-xs font-bold mb-6">
              <Star className="h-3 w-3 fill-current" />
              <span>لحوم بلدية طازجة 100%</span>
            </div>
            <h1 className="text-5xl md:text-8xl font-black mb-6 font-heading leading-tight tracking-tighter">
              طعم الفخامة <br />
              <span className="text-primary drop-shadow-sm">في كل قطعة</span>
            </h1>
            <p className="text-lg md:text-2xl mb-10 text-gray-200 font-medium max-w-lg leading-relaxed">
              نقدم لك أجود أنواع الذبائح المختارة بعناية فائقة، تذبح يومياً وتصلك مغلفة بأعلى المعايير.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/products">
                <Button size="lg" className="h-16 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-2xl shadow-primary/40 text-xl font-black transition-all hover:scale-105 active:scale-95">
                  اطلب ذبيحتك الآن
                  <ArrowLeft className="mr-2 h-6 w-6" />
                </Button>
              </Link>
              <Link href="/products?category=beef">
                <Button size="lg" variant="outline" className="h-16 px-10 rounded-2xl border-white/20 bg-white/5 backdrop-blur-md text-white hover:bg-white/10 text-xl font-bold border-2">
                  عروض العجل
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features - Grid Cards */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Clock, title: "جودة مضمونة", desc: "لحوم طازجة يومياً", color: "bg-red-50 text-red-600" },
              { icon: Truck, title: "توصيل بارد", desc: "سيارات مجهزة بالكامل", color: "bg-blue-50 text-blue-600" },
              { icon: ShieldCheck, title: "ذبح إسلامي", desc: "تحت إشراف طبي", color: "bg-green-50 text-green-600" },
              { icon: Star, title: "تقطيع احترافي", desc: "حسب اختيارك المفضل", color: "bg-amber-50 text-amber-600" },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`${f.color} p-8 rounded-[2.5rem] flex flex-col items-center text-center gap-4 border border-transparent hover:border-current/10 transition-all cursor-default group`}
              >
                <div className="p-5 rounded-3xl bg-white shadow-sm group-hover:shadow-md transition-all group-hover:scale-110 group-hover:-rotate-3">
                  <f.icon className="h-8 w-8" />
                </div>
                <div>
                  <h4 className="font-black text-gray-900 text-lg">{f.title}</h4>
                  <p className="text-xs font-bold opacity-70">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="py-20 bg-gray-50/50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-12 px-2">
            <div>
              <h2 className="text-4xl font-black text-gray-900 font-heading mb-2">أقسامنا الفاخرة</h2>
              <p className="text-gray-500 font-bold">كل ما تحتاجه مائدة طعامك في مكان واحد</p>
            </div>
            <Link href="/products">
              <Button variant="ghost" className="text-primary font-black hover:bg-primary/5 text-lg">عرض الكل</Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {categories.filter(c => c.id !== 'all').map((cat, i) => (
              <Link key={cat.id} href={`/products?category=${cat.id}`}>
                <motion.div
                  whileHover={{ y: -10 }}
                  className="group cursor-pointer relative overflow-hidden rounded-[2.5rem] aspect-[4/5] shadow-lg bg-white"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10 opacity-80 group-hover:opacity-90 transition-opacity" />
                  <img src={cat.image || ''} alt={cat.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-end p-8 text-white">
                    <span className="text-4xl mb-4 group-hover:scale-125 transition-transform duration-500">{cat.icon}</span>
                    <h3 className="text-2xl font-black tracking-tight">{cat.name}</h3>
                    <div className="h-1 w-0 bg-primary mt-2 group-hover:w-12 transition-all duration-500 rounded-full" />
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Premium Footer */}
      <footer className="bg-gray-900 text-white pt-20 pb-28 md:pb-12 border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="space-y-6">
              <h2 className="text-3xl font-black text-primary tracking-tighter">ملحمة النعيمي</h2>
              <p className="text-gray-400 text-sm leading-relaxed font-medium capitalize">
                أجود أنواع اللحوم الطازجة والذبائح المختارة بعناية. نلتزم بأعلى معايير الجودة والذبح الإسلامي لضمان مذاق لا يقاوم.
              </p>
            </div>

            <div className="space-y-6">
              <h4 className="font-black text-xl border-b border-primary/20 pb-2 w-fit">روابط سريعة</h4>
              <ul className="space-y-3 text-gray-400 text-sm font-bold">
                <li><Link href="/products" className="hover:text-primary transition-colors">جميع المنتجات</Link></li>
                <li><Link href="/" className="hover:text-primary transition-colors">الرئيسية</Link></li>
                <li><Link href="/cart" className="hover:text-primary transition-colors">سلة المشتريات</Link></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="font-black text-xl border-b border-primary/20 pb-2 w-fit">الدعم الفني</h4>
              <ul className="space-y-3 text-gray-400 text-sm font-bold">
                <li><Link href="/profile" className="hover:text-primary transition-colors font-bold tracking-tight">حسابي الشخصي</Link></li>
                <li>واتساب: 05XXXXXXXX</li>
                <li>ساعات العمل: 8:00 ص - 10:00 م</li>
              </ul>
            </div>

            <div className="space-y-8">
              <h4 className="font-black text-xl border-b border-primary/20 pb-2 w-fit">تسوق آمن</h4>
              <div className="flex gap-4">
                <div className="h-10 w-16 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center grayscale hover:grayscale-0 transition-all cursor-pointer">
                  <span className="text-[8px] font-black opacity-30">VISA</span>
                </div>
                <div className="h-10 w-16 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center grayscale hover:grayscale-0 transition-all cursor-pointer">
                  <span className="text-[8px] font-black opacity-30">MADA</span>
                </div>
              </div>
              <div className="p-6 rounded-[2rem] bg-primary/10 border border-primary/20 text-center">
                <p className="text-xs font-black text-primary mb-2 tracking-widest">تطبيق ضريبة القيمة المضافة</p>
                <p className="text-[10px] text-gray-400">جميع الأسعار المعروضة تشمل الضريبة بنسبة 15%</p>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-gray-500 font-bold tracking-tight">
            <p>© 2025 ملحمة النعيمي الفاخر. جميع الحقوق محفوظة.</p>
            <div className="flex gap-8">
              <span className="hover:text-white cursor-pointer transition-colors">سياسة الخصوصية</span>
              <span className="hover:text-white cursor-pointer transition-colors">الشروط والأحكام</span>
              <span className="hover:text-white cursor-pointer transition-colors">سياسة الاسترجاع</span>
            </div>
          </div>
        </div>
      </footer>

      <BottomNav />
    </motion.div>
  );
}

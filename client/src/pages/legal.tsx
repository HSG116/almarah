import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { FileText, ShieldCheck, Award, ChevronRight } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function Legal() {
    const [location] = useLocation();
    const type = location.split("/").pop() || "terms";

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

    const contentMap: Record<string, { title: string, icon: any, key: string }> = {
        terms: { title: "شروط الاستخدام", icon: FileText, key: "legal_terms" },
        privacy: { title: "سياسة الخصوصية", icon: ShieldCheck, key: "legal_privacy" },
        copyright: { title: "حقوق المليكة", icon: Award, key: "legal_copyright" }
    };

    const active = contentMap[type] || contentMap.terms;
    const content = settingsMap[active.key] || "جاري تحميل المحتوى...";

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <Navbar />

            <div className="bg-slate-900 py-20 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -translate-y-10 translate-x-10" />
                <div className="container mx-auto px-4 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-6"
                    >
                        <div className="p-5 bg-white/10 rounded-3xl backdrop-blur-md border border-white/10">
                            <active.icon className="w-12 h-12 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-4xl md:text-5xl font-black mb-2">{active.title}</h1>
                            <p className="text-slate-400 font-medium tracking-wide prose-invert">آخر تحديث: {new Date().toLocaleDateString('ar-SA')}</p>
                        </div>
                    </motion.div>
                </div>
            </div>

            <div className="container mx-auto px-4 -mt-10 relative z-20">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="lg:col-span-1 space-y-3">
                        {[
                            { id: 'terms', label: 'شروط الاستخدام', icon: FileText },
                            { id: 'privacy', label: 'سياسة الخصوصية', icon: ShieldCheck },
                            { id: 'copyright', label: 'حقوق الملكية', icon: Award }
                        ].map((item) => (
                            <Link key={item.id} href={`/legal/${item.id}`}>
                                <div className={`flex items-center justify-between p-5 rounded-2xl cursor-pointer transition-all ${type === item.id ? 'bg-primary text-white shadow-xl shadow-primary/30' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>
                                    <div className="flex items-center gap-3">
                                        <item.icon className="w-5 h-5" />
                                        <span className="font-black">{item.label}</span>
                                    </div>
                                    <ChevronRight className={`w-4 h-4 ${type === item.id ? 'opacity-100' : 'opacity-0'}`} />
                                </div>
                            </Link>
                        ))}
                    </div>

                    <div className="lg:col-span-3">
                        <motion.div
                            key={type}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white p-10 md:p-16 rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100"
                        >
                            <div className="prose prose-slate prose-xl max-w-none text-right" dir="rtl">
                                <div className="whitespace-pre-wrap leading-relaxed text-slate-700 font-medium">
                                    {content}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            <BottomNav />
        </div>
    );
}

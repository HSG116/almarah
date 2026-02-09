import { Link } from "wouter";
import { User, Bell, Search } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";

export function MobileHeader() {
    const { user } = useAuth();

    return (
        <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="md:hidden sticky top-0 z-[50] w-full bg-background/80 backdrop-blur-lg border-b px-4 h-15 flex items-center justify-between shadow-sm"
        >
            <Link href="/" className="flex items-center gap-2 cursor-pointer">
                <div className="h-9 w-9 bg-primary rounded-xl flex items-center justify-center shadow-lg transform -rotate-3 group-hover:rotate-0 transition-transform">
                    <span className="text-white font-black text-xs">M</span>
                </div>
                <span className="text-xl font-black text-primary font-heading tracking-tighter">
                    ملحمة النعيمي
                </span>
            </Link>

            <div className="flex items-center gap-2">
                <Link href="/products">
                    <button className="p-2.5 rounded-2xl bg-secondary/30 text-primary active:scale-90 transition-all">
                        <Search className="h-5 w-5" />
                    </button>
                </Link>
                <Link href="/profile">
                    <div className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center text-white border-2 border-white shadow-md overflow-hidden active:scale-90 transition-all">
                        {user ? (
                            <span className="text-xs font-black">{user.username.substring(0, 2).toUpperCase()}</span>
                        ) : (
                            <User className="h-5 w-5" />
                        )}
                    </div>
                </Link>
            </div>
        </motion.div>
    );
}

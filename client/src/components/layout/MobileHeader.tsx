import { Link } from "wouter";
import { User, Search } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useState } from "react";

export function MobileHeader() {
    const { user } = useAuth();
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);
    const [scrolled, setScrolled] = useState(false);
    const { scrollY } = useScroll();

    useMotionValueEvent(scrollY, "change", (latest) => {
        const diff = latest - lastScrollY;

        if (latest < 10) {
            setScrolled(false);
            setIsVisible(true);
        } else {
            setScrolled(true);
            if (diff > 8) {
                setIsVisible(false);
            } else if (diff < -5) {
                setIsVisible(true);
            }
        }

        setLastScrollY(latest);
    });

    return (
        <motion.header
            className="md:hidden sticky top-0 z-[50] w-full"
            initial={{ y: -80, opacity: 0 }}
            animate={{
                y: isVisible ? 0 : -80,
                opacity: isVisible ? 1 : 0,
            }}
            transition={{
                type: "spring",
                stiffness: 340,
                damping: 30,
                mass: 0.7,
            }}
        >
            <div className={`relative bg-white transition-shadow duration-300 ${scrolled ? 'shadow-md' : 'shadow-sm'
                }`}>
                {/* Bottom border line */}
                <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

                <div className="px-4 h-[68px] flex items-center justify-between" dir="rtl">
                    {/* Right: Logo + Brand name */}
                    <Link href="/">
                        <motion.div
                            className="flex items-center gap-2.5 cursor-pointer"
                            whileTap={{ scale: 0.96 }}
                        >
                            <img
                                src="/uploads/LOGO.png"
                                alt="المراح"
                                className="w-11 h-11 object-contain"
                            />
                            <div className="flex flex-col">
                                <span className="text-xl font-black text-primary font-heading tracking-tight leading-none">
                                    المراح
                                </span>
                                <span className="text-[7px] font-bold text-gray-400 tracking-[0.18em] mt-0.5 uppercase">
                                    AL MARAH
                                </span>
                            </div>
                        </motion.div>
                    </Link>

                    {/* Left: Actions */}
                    <div className="flex items-center gap-2">
                        <Link href="/products">
                            <motion.button
                                className="h-9 w-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 border border-gray-100"
                                whileTap={{ scale: 0.88 }}
                            >
                                <Search className="h-4 w-4" strokeWidth={2.2} />
                            </motion.button>
                        </Link>

                        <Link href="/profile">
                            <motion.div whileTap={{ scale: 0.88 }}>
                                <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm shadow-primary/20">
                                    {user ? (
                                        <span className="text-[10px] font-black">{user.username.substring(0, 2).toUpperCase()}</span>
                                    ) : (
                                        <User className="h-4 w-4" strokeWidth={2.5} />
                                    )}
                                </div>
                            </motion.div>
                        </Link>
                    </div>
                </div>
            </div>
        </motion.header>
    );
}

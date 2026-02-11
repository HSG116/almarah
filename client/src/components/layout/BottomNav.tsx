import { Link, useLocation } from "wouter";
import { Home, ShoppingBag, ShoppingCart, User, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence, useMotionValueEvent, useScroll } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/lib/cart-context";
import { useState } from "react";

const spring = { type: "spring" as const, stiffness: 420, damping: 28, mass: 0.8 };

export function BottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { items } = useCart();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const diff = latest - lastScrollY;
    const atBottom = (window.innerHeight + latest) >= document.body.scrollHeight - 50;
    if (latest < 10 || atBottom) {
      setIsVisible(true);
    } else if (diff > 12) {
      setIsVisible(false);
    } else if (diff < -6) {
      setIsVisible(true);
    }
    setLastScrollY(latest);
  });

  const isStaff = user && user.role && user.role !== "customer";
  const staffLink = isStaff && user
    ? { href: user.role === "admin" ? "/admin" : `/${user.role}`, icon: ShieldCheck, label: "محطتي", badge: 0 }
    : null;

  const navItems = [
    { href: "/", icon: Home, label: "الرئيسية", badge: 0 },
    { href: "/products", icon: ShoppingBag, label: "المنتجات", badge: 0 },
    ...(staffLink ? [staffLink] : []),
    { href: "/cart", icon: ShoppingCart, label: "السلة", badge: items.length },
    { href: "/profile", icon: User, label: "حسابي", badge: 0 },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none" dir="rtl">
      <motion.div
        className="pointer-events-auto"
        initial={{ y: 120, opacity: 0 }}
        animate={{
          y: isVisible ? 0 : 140,
          opacity: isVisible ? 1 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 28,
          mass: 0.8,
        }}
      >
        <div className="px-3 pb-[max(8px,env(safe-area-inset-bottom))]">
          {/* Main bar */}
          <div className="relative bg-white rounded-[24px] shadow-[0_-4px_30px_-8px_rgba(0,0,0,0.1),0_4px_20px_-4px_rgba(0,0,0,0.06)] border border-gray-100/50">
            {/* Top accent */}
            <div className="absolute top-0 inset-x-[12%] h-[1.5px] bg-gradient-to-r from-transparent via-primary/20 to-transparent rounded-full" />

            {/* Nav items */}
            <div className="relative flex items-end justify-around px-1 pt-3 pb-2.5">
              {navItems.map((item, index) => {
                const isActive = location === item.href;
                const Icon = item.icon;

                return (
                  <Link key={item.href} href={item.href}>
                    <motion.a
                      className="relative flex flex-col items-center cursor-pointer flex-1"
                      whileTap={{ scale: 0.85 }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04, ...spring }}
                    >
                      {/* ===== ACTIVE: Floating circle ===== */}
                      {isActive ? (
                        <motion.div
                          className="relative flex flex-col items-center"
                          layoutId="activeNavItem"
                          transition={spring}
                        >
                          {/* Circle that floats above — pops up from inside the bar */}
                          <motion.div
                            className="relative -mt-8 mb-1"
                            initial={{ y: 45, scale: 0.2, opacity: 0 }}
                            animate={{ y: 0, scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 350, damping: 22, mass: 0.6 }}
                          >
                            {/* Outer breathing glow */}
                            <motion.div
                              className="absolute inset-[-8px] rounded-full"
                              style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)" }}
                              animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
                              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                            />
                            {/* White border ring */}
                            <div className="absolute inset-[-4px] rounded-full bg-white shadow-lg shadow-gray-200/50" />
                            {/* The red circle */}
                            <div
                              className="relative w-[50px] h-[50px] rounded-full flex items-center justify-center"
                              style={{
                                background: "linear-gradient(145deg, hsl(var(--primary)), hsl(var(--primary) / 0.82))",
                                boxShadow: "0 6px 20px -3px hsl(var(--primary) / 0.45)",
                              }}
                            >
                              <Icon className="h-[21px] w-[21px] text-white" strokeWidth={2.4} />
                            </div>

                            {/* Badge */}
                            <AnimatePresence>
                              {item.badge > 0 && (
                                <motion.div
                                  className="absolute -top-1 -left-1 z-20"
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  exit={{ scale: 0 }}
                                  transition={{ type: "spring", stiffness: 500, damping: 12 }}
                                >
                                  <div className="min-w-[19px] h-[19px] bg-red-500 text-white text-[9px] flex items-center justify-center rounded-full font-black px-1 ring-2 ring-white shadow-md">
                                    {item.badge}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>

                          {/* Active label */}
                          <motion.span
                            className="text-[10px] font-extrabold text-primary tracking-tight"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.08 }}
                          >
                            {item.label}
                          </motion.span>

                          {/* Underline dot */}
                          <motion.div
                            className="w-1 h-1 rounded-full bg-primary mt-1"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.15, type: "spring", stiffness: 500 }}
                            style={{ boxShadow: "0 0 6px 1px hsl(var(--primary) / 0.3)" }}
                          />
                        </motion.div>
                      ) : (
                        /* ===== INACTIVE: Normal icon ===== */
                        <motion.div className="flex flex-col items-center" transition={spring}>
                          <div className="relative">
                            <Icon
                              className="h-[20px] w-[20px] text-gray-400"
                              strokeWidth={1.7}
                            />
                            {/* Badge for inactive items */}
                            <AnimatePresence>
                              {item.badge > 0 && (
                                <motion.div
                                  className="absolute -top-1.5 -left-2 z-20"
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  exit={{ scale: 0 }}
                                  transition={{ type: "spring", stiffness: 500, damping: 12 }}
                                >
                                  <div className="min-w-[16px] h-4 bg-primary text-white text-[8px] flex items-center justify-center rounded-full font-black px-1 ring-2 ring-white">
                                    {item.badge}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          <span className="text-[10px] font-bold text-gray-400 mt-1.5 tracking-tight">
                            {item.label}
                          </span>
                        </motion.div>
                      )}
                    </motion.a>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

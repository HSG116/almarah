import { Link, useLocation } from "wouter";
import { Home, ShoppingBag, ShoppingCart, User, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/lib/cart-context";

export function BottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { items } = useCart();

  // Determine if user is staff
  const isStaff = user && user.role && user.role !== 'customer';

  // Staff Logic: Only show specific role dashboard link if staff
  const staffLink = isStaff && user
    ? { href: user.role === 'admin' ? '/admin' : `/${user.role}`, icon: ShieldCheck, label: "محطتي", badge: 0 }
    : null;

  const finalNavItems = [
    { href: "/", icon: Home, label: "الرئيسي", badge: 0 },
    { href: "/products", icon: ShoppingBag, label: "المنتجات", badge: 0 },
    ...(staffLink ? [staffLink] : []),
    { href: "/cart", icon: ShoppingCart, label: "السلة", badge: items.length },
    { href: "/profile", icon: User, label: "حسابي", badge: 0 },
  ];

  return (
    <div className="md:hidden fixed bottom-4 left-4 right-4 z-50">
      {/* Premium Container: Enhanced Blur + Glassmorphism */}
      <motion.div
        className="relative bg-white/70 backdrop-blur-[40px] border border-white/60 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] rounded-[2.5rem] p-3 overflow-hidden"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        {/* Ambient Background Glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-50" />

        {/* Navigation Items Container */}
        <div className="relative flex items-center justify-around h-[4.5rem]">
          {finalNavItems.map((item) => {
            const isActive = location === item.href;

            return (
              <Link key={item.href} href={item.href}>
                <motion.a
                  className="flex flex-col items-center justify-center w-full h-full gap-1.5 cursor-pointer group relative px-3"
                  whileTap={{ scale: 0.9 }}
                >
                  {/* Active Background Bubble */}
                  {isActive && (
                    <motion.div
                      layoutId="activeNavBubble"
                      className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 rounded-[1.75rem]"
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    >
                      <div className="absolute inset-0 rounded-[1.75rem] bg-gradient-to-br from-primary/20 to-transparent blur-sm" />
                    </motion.div>
                  )}

                  {/* Icon Container */}
                  <motion.div
                    className={`
                      relative h-11 w-11 flex items-center justify-center rounded-[1.25rem] transition-all duration-300
                      ${isActive
                        ? 'bg-primary text-white shadow-lg shadow-primary/40'
                        : 'bg-gray-50/50 text-gray-400 group-hover:bg-gray-100/70'
                      }
                    `}
                    animate={{
                      scale: isActive ? 1.1 : 1,
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <item.icon
                      className="h-5 w-5"
                      strokeWidth={isActive ? 2.8 : 2.2}
                    />

                    {/* Badge */}
                    {item.badge > 0 && (
                      <motion.span
                        className="absolute -top-1.5 -right-1.5 z-20 h-5 w-5 bg-red-500 text-white text-[9px] flex items-center justify-center rounded-full ring-2 ring-white font-black shadow-lg"
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                      >
                        {item.badge}
                      </motion.span>
                    )}
                  </motion.div>

                  {/* Label */}
                  <motion.span
                    className={`
                      text-[10px] font-extrabold tracking-tight
                      ${isActive ? 'text-primary' : 'text-gray-500'}
                    `}
                    animate={{
                      opacity: isActive ? 1 : 0.7,
                      scale: isActive ? 1 : 0.95
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    {item.label}
                  </motion.span>

                  {/* Bottom Indicator */}
                  {isActive && (
                    <motion.div
                      className="absolute -bottom-1 left-1/2 w-1 h-1 bg-primary rounded-full"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      style={{ x: "-50%" }}
                      transition={{ type: "spring", stiffness: 400 }}
                    />
                  )}
                </motion.a>
              </Link>
            );
          })}
        </div>

        {/* Bottom Shine Effect */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      </motion.div>
    </div>
  );
}

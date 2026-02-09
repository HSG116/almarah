import { Link, useLocation } from "wouter";
import { Home, ShoppingBag, ShoppingCart, User, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
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
    // If staff, insert dashboard in middle, else regular
    ...(staffLink ? [staffLink] : []),
    { href: "/cart", icon: ShoppingCart, label: "السلة", badge: items.length },
    { href: "/profile", icon: User, label: "حسابي", badge: 0 },
  ];

  return (
    <div className="md:hidden fixed bottom-6 left-6 right-6 z-50">
      {/* Container: Floating + Blurry + Rounded */}
      <div className="bg-white/90 backdrop-blur-xl border border-white/40 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] rounded-[2rem] p-2 flex items-center justify-around h-[5rem]">
        {finalNavItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <a className="flex flex-col items-center justify-center w-full h-full gap-1 cursor-pointer group relative">

                {/* Active Background Pill (Optional: subtle glow) */}
                {isActive && (
                  <motion.div
                    layoutId="navPill"
                    className="absolute inset-0 bg-primary/5 rounded-[1.5rem] -z-10"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}

                {/* Icon Container: Squircle */}
                <div className={`
                  relative h-10 w-10 flex items-center justify-center rounded-2xl transition-all duration-300
                  ${isActive
                    ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110'
                    : 'bg-transparent text-gray-400 group-hover:bg-gray-50'
                  }
                `}>
                  <item.icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />

                  {/* Badge */}
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 z-20 h-4 w-4 bg-red-500 text-white text-[9px] flex items-center justify-center rounded-full ring-2 ring-white font-bold animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span className={`
                  text-[10px] font-bold transition-all duration-300
                  ${isActive ? 'text-primary translate-y-0 opacity-100' : 'text-gray-400 translate-y-1 opacity-70'}
                `}>
                  {item.label}
                </span>
              </a>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

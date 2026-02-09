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

  // Define base nav items
  const navItems = [
    { href: "/", icon: Home, label: "الرئيسية" },
    { href: "/products", icon: ShoppingBag, label: "المنتجات" },
    { href: "/cart", icon: ShoppingCart, label: "السلة", badge: items.length },
    { href: "/profile", icon: User, label: "حسابي" },
  ];

  // Add staff dashboard if applicable
  if (isStaff) {
    const rolePath = user.role === 'admin' ? '/admin' : `/${user.role}`;
    navItems.splice(2, 0, { href: rolePath, icon: ShieldCheck, label: "لوحة التحكم" });
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t shadow-[0_-5px_20px_rgba(0,0,0,0.05)] pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className="flex-1 h-full">
              <a className={`flex flex-col items-center justify-center w-full h-full space-y-1 cursor-pointer relative ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary/70'}`}>
                <motion.div
                  className="relative z-10 flex flex-col items-center justify-center"
                  animate={{
                    scale: isActive ? 1.15 : 1,
                    y: isActive ? -4 : 0
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <item.icon className={`h-6 w-6 ${isActive ? 'drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]' : ''}`} />
                  {item.badge ? (
                    <span className="absolute -top-2 -right-2 h-4 w-4 bg-primary text-white text-[10px] flex items-center justify-center rounded-full ring-2 ring-background font-bold">
                      {item.badge}
                    </span>
                  ) : null}
                </motion.div>
                <motion.span
                  className="text-[10px] font-black z-10"
                  animate={{
                    opacity: isActive ? 1 : 0.7,
                    scale: isActive ? 1.05 : 1
                  }}
                >
                  {item.label}
                </motion.span>
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-x-2 bottom-1.5 top-1.5 bg-primary/10 rounded-2xl"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </a>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

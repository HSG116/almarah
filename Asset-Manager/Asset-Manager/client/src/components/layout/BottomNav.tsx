import { Link, useLocation } from "wouter";
import { Home, ShoppingBag, ShoppingCart, User } from "lucide-react";

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: Home, label: "الرئيسية" },
    { href: "/products", icon: ShoppingBag, label: "المنتجات" },
    { href: "/cart", icon: ShoppingCart, label: "السلة", badge: 3 },
    { href: "/profile", icon: User, label: "حسابي" },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-[0_-5px_20px_rgba(0,0,0,0.05)] pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className={`flex-1 h-full flex flex-col items-center justify-center w-full space-y-1 cursor-pointer relative ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary/70'}`}>
              <div 
                className={`relative z-10 flex flex-col items-center justify-center transition-transform duration-200 ${isActive ? 'scale-110 -translate-y-0.5' : ''}`}
              >
                <item.icon className="h-6 w-6" />
                {item.badge && (
                  <span className="absolute -top-2 -right-2 h-4 w-4 bg-primary text-white text-[10px] flex items-center justify-center rounded-full ring-2 ring-background">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium z-10 transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute inset-x-1 bottom-0.5 top-0.5 bg-primary/10 rounded-2xl transition-all duration-200" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

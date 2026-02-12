import { Link, useLocation } from "wouter";
import { ShoppingCart, Menu, Search, User, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/lib/cart-context";

export function Navbar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { items } = useCart();

  const isStaff = user && user.role && user.role !== "customer";
  const staffHref = isStaff && user
    ? (user.role === "admin" ? "/admin" : `/${user.role}`)
    : null;

  return (
    <nav className="hidden md:block sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-4 cursor-pointer group">
            <img
              src="/uploads/LOGO.png"
              alt="المراح"
              className="w-20 h-20 md:w-28 md:h-28 object-contain transition-transform duration-300 group-hover:scale-110 drop-shadow-md"
            />
            <span className="text-4xl md:text-5xl font-black text-primary font-heading tracking-tighter drop-shadow-sm group-hover:text-primary/90 transition-colors">
              المراح
            </span>
          </Link>
          <div className="flex items-center gap-6 text-sm font-medium">
            <Link href="/" className={`relative cursor-pointer hover:text-primary transition-colors py-2 ${location === '/' ? 'text-primary' : 'text-muted-foreground'}`}>
              الرئيسية
              {location === '/' && (
                <motion.div
                  layoutId="navActive"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </Link>
            <Link href="/products" className={`relative cursor-pointer hover:text-primary transition-colors py-2 ${location === '/products' ? 'text-primary' : 'text-muted-foreground'}`}>
              منتجاتنا
              {location === '/products' && (
                <motion.div
                  layoutId="navActive"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </Link>
            {staffHref && (
              <Link href={staffHref} className={`relative cursor-pointer hover:text-primary transition-colors py-2 ${location === staffHref ? 'text-primary' : 'text-muted-foreground'}`}>
                محطتي
                {location === staffHref && (
                  <motion.div
                    layoutId="navActive"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث عن منتج..."
              className="w-full pr-10 rounded-full bg-muted/50 border-none focus-visible:ring-1"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/cart">
            <Button variant="ghost" size="icon" className="relative hover:bg-secondary/20 cursor-pointer">
              <ShoppingCart className="h-5 w-5" />
              {items.length > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-white text-[10px] flex items-center justify-center rounded-full">
                  {items.length}
                </span>
              )}
            </Button>
          </Link>

          {user ? (
            <Link href="/profile">
              <Button variant="outline" className="rounded-full px-6 font-bold shadow-sm hover:shadow-md transition-all cursor-pointer border-primary text-primary">
                <User className="ml-2 h-4 w-4" />
                {user.username}
              </Button>
            </Link>
          ) : (
            <Link href="/auth">
              <Button variant="default" className="rounded-full px-6 font-bold shadow-md hover:shadow-lg transition-all cursor-pointer">
                <User className="ml-2 h-4 w-4" />
                تسجيل الدخول
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

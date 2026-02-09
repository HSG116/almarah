import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { CartProvider } from "./lib/cart-context";
import { NotificationManager } from "@/components/layout/NotificationManager";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Products from "@/pages/products";
import Cart from "@/pages/cart";
import Auth from "@/pages/auth";
import Profile from "@/pages/profile";
import Checkout from "@/pages/checkout";
import AdminLogin from "@/pages/admin/login";
import AdminDashboard from "@/pages/admin/dashboard";
import StaffDashboard from "@/pages/staff/dashboard";
import Legal from "@/pages/legal";


function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}


function Router() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (user && user.role && user.role !== 'customer') {
      const customerRoutes = ['/', '/products', '/cart', '/profile', '/checkout', '/auth'];
      const staffRoutes = ['/staff', '/delivery', '/butcher', '/accountant', '/support', '/designer', '/manager'];

      // If staff tries to access customer pages or the generic /staff page, redirect to their specific role page
      if (customerRoutes.includes(location) || location === '/staff') {
        if (user.role === 'admin' || user.isAdmin) {
          setLocation('/admin');
        } else {
          // Redirect to specific role page if it's not one of the staff routes already
          const rolePath = `/${user.role}`;
          if (location !== rolePath) {
            setLocation(rolePath);
          }
        }
      }
    }
  }, [user, location, setLocation]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Switch key={location}>
        <Route path="/" component={Home} />
        <Route path="/products" component={Products} />
        <Route path="/cart" component={Cart} />
        <Route path="/auth" component={Auth} />
        <Route path="/profile" component={Profile} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/legal/:type" component={Legal} />
        <Route path="/legal" component={Legal} />

        {/* Admin Routes */}
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/admin" component={AdminDashboard} />

        {/* Staff Dedicated Routes */}
        <Route path="/staff">
          <StaffDashboard />
        </Route>
        <Route path="/delivery">
          <StaffDashboard forcedRole="delivery" />
        </Route>
        <Route path="/butcher">
          <StaffDashboard forcedRole="butcher" />
        </Route>
        <Route path="/accountant">
          <StaffDashboard forcedRole="accountant" />
        </Route>
        <Route path="/support">
          <StaffDashboard forcedRole="support" />
        </Route>
        <Route path="/designer">
          <StaffDashboard forcedRole="designer" />
        </Route>
        <Route path="/manager">
          <StaffDashboard forcedRole="manager" />
        </Route>
        <Route path="/general-manager">
          <StaffDashboard forcedRole="admin" />
        </Route>

        <Route component={NotFound} />
      </Switch>
    </AnimatePresence>
  );
}


function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <TooltipProvider>
            <WouterRouter base="/almarah">
              <Toaster />
              <NotificationManager />
              <Router />
            </WouterRouter>
          </TooltipProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

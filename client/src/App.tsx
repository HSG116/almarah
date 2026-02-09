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
    if (!user) return;

    // 1. Strictly Confined Staff Roles
    // These roles are NOT allowed to navigate anywhere except their specific dashboard
    const confinedRoles = ['delivery', 'butcher', 'accountant', 'support', 'designer', 'manager'];

    const role = user.role || 'customer';
    const isConfinedStaff = confinedRoles.includes(role);
    const isAdmin = role === 'admin' || user.isAdmin === true;

    // Case A: Confined Staff (e.g. Butcher, Delivery)
    // STRICT: Even if they have admin flag, if their role is confined, they are confined.
    if (isConfinedStaff) {
      const allowedPath = `/${role}`;
      // Allow exact match or sub-paths of their role
      if (!location.startsWith(allowedPath)) {
        // Prevent access to Admin, Home, or other Staff pages
        // Redirect Forcefully to their Dashboard
        setLocation(allowedPath);
      }
    }

    // Case B: Admin
    // If Admin is on a customer-only page (like auth), redirect to dashboard
    else if (isAdmin) {
      if (location === '/auth') {
        setLocation('/admin');
      }
    }

    // Case C: Customer
    else if (role === 'customer') {
      if (location === '/auth') {
        setLocation('/');
        return;
      }

      const isRestricted =
        location.startsWith('/admin') ||
        location.startsWith('/staff') ||
        confinedRoles.some(r => location.startsWith(`/${r}`));

      if (isRestricted) {
        setLocation('/');
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
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "") || "/"}>
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

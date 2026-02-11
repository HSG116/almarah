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
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";


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
  const [location] = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Switch key={location}>
        {/* Public Routes */}
        <Route path="/" component={Home} />
        <Route path="/products" component={Products} />
        <Route path="/cart" component={Cart} />
        <Route path="/auth" component={Auth} />
        <Route path="/legal/:type" component={Legal} />
        <Route path="/legal" component={Legal} />

        {/* Protected Customer/Generic Routes */}
        <Route path="/profile">
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        </Route>
        <Route path="/checkout">
          <ProtectedRoute>
            <Checkout />
          </ProtectedRoute>
        </Route>

        {/* Admin Routes - Strictly Protected */}
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin">
          <ProtectedRoute requireAdmin>
            <AdminDashboard />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/dashboard">
          <ProtectedRoute requireAdmin>
            <AdminDashboard />
          </ProtectedRoute>
        </Route>

        {/* Staff Dedicated Routes - Role Based Protection */}
        <Route path="/staff">
          <ProtectedRoute allowedRoles={['delivery', 'butcher', 'accountant', 'support', 'designer', 'manager', 'admin']}>
            <StaffDashboard />
          </ProtectedRoute>
        </Route>

        <Route path="/delivery">
          <ProtectedRoute allowedRoles={['delivery', 'admin']}>
            <StaffDashboard forcedRole="delivery" />
          </ProtectedRoute>
        </Route>

        <Route path="/butcher">
          <ProtectedRoute allowedRoles={['butcher', 'admin']}>
            <StaffDashboard forcedRole="butcher" />
          </ProtectedRoute>
        </Route>

        <Route path="/accountant">
          <ProtectedRoute allowedRoles={['accountant', 'admin']}>
            <StaffDashboard forcedRole="accountant" />
          </ProtectedRoute>
        </Route>

        <Route path="/support">
          <ProtectedRoute allowedRoles={['support', 'admin']}>
            <StaffDashboard forcedRole="support" />
          </ProtectedRoute>
        </Route>

        <Route path="/designer">
          <ProtectedRoute allowedRoles={['designer', 'admin']}>
            <StaffDashboard forcedRole="designer" />
          </ProtectedRoute>
        </Route>

        <Route path="/manager">
          <ProtectedRoute allowedRoles={['manager', 'admin']}>
            <StaffDashboard forcedRole="manager" />
          </ProtectedRoute>
        </Route>

        <Route path="/general-manager">
          <ProtectedRoute requireAdmin>
            <StaffDashboard forcedRole="admin" />
          </ProtectedRoute>
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

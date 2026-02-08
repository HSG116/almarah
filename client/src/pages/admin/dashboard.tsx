import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import {
  CreditCard,
  Package,
  Users,
  LayoutDashboard,
  LogOut,
  Plus,
  Trash2,
  Edit,
  Loader2,
  Image as ImageIcon,
  Check,
  X,
  ChevronDown,
  FolderTree,
  Scaling,
  Truck,
  Ticket,
  UtensilsCrossed,
  BarChart3,
  Settings,
  Bell,
  Search,
  Printer,
  FileText,
  MapPin,
  Gift,
  Ban,
  MessageSquare,
  TrendingUp,
  PieChart,
  ShoppingBag,
  Clock,
  Unlock,
  Lock,
  Scissors,
  Box,
  AlertTriangle,
  PlusCircle,
  Phone,
  Navigation,
  UserCheck,
  UserX,
  DollarSign,
  Megaphone,
  Crown,
  Award,
  Star,
  Mail,
  LayoutGrid,
  EyeOff,
  Eye,
  Calendar,
  PenTool,
  User as UserIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Product, type Order, type Category, type User, type Coupon, type Offer, type DeliveryZone, type ProductAttribute, type Driver, type Staff, type SiteSettings } from "@shared/schema";
import { supabase } from "@/lib/supabase";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { ScrollArea } from "@/components/ui/scroll-area";
import ZoneMap from "@/components/admin/ZoneMap";

import CoverageMap from "@/components/admin/CoverageMap";
import ZonesPreviewMap from "@/components/admin/ZonesPreviewMap";



export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, logoutMutation } = useAuth();
  const [activeTab, setActiveTab] = useState("reports");
  const [activeSettingsTab, setActiveSettingsTab] = useState("general");
  const queryClient = useQueryClient();

  // --- Data Fetching ---
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*');
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000, // Every 30 seconds
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('id', { ascending: false });
      if (error) throw error;
      return (data || []).map(p => ({
        ...p,
        isActive: p.is_active !== false,
        isFeatured: p.is_featured === true,
        categoryId: p.category_id,
        imageObjectPosition: p.image_object_position || "object-center",
        stockQuantity: p.stock_quantity || 0,
        isOutOfStock: p.is_out_of_stock || false,
        hasCutting: p.has_cutting || false,
        hasPackaging: p.has_packaging || false
      })) as Product[];
    },
    refetchInterval: 20000, // Every 20 seconds
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery<(Order & { order_items: any[] })[]>({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('id', { ascending: false });
      if (error) throw error;
      return (data || []).map(o => ({
        ...o,
        userId: o.user_id,
        driverStaffId: o.driver_staff_id,
        butcherStaffId: o.butcher_staff_id,
        zoneId: o.zone_id,
        deliveryFee: o.delivery_fee,
        subtotalAmount: o.subtotal,
        discountAmount: o.discount_amount,
        createdAt: o.created_at || o.createdAt,
        updatedAt: o.updated_at || o.updatedAt,
        customerName: o.customer_name || o.customerName,
        customerPhone: o.customer_phone || o.customerPhone
      })) as any[];
    },
    refetchInterval: 10000,
  });

  // --- Real-time Sync Logic ---
  useEffect(() => {
    // Listen to ALL changes in the public schema
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
        },
        (payload) => {
          console.log('🔄 [REALTIME] Change detected:', payload);
          // Invalidate ALL queries to ensure complete sync
          // We can be more specific, but this is the safest way to "update the whole site"
          queryClient.invalidateQueries();

          // Optional: Show a small toast for certain events
          if (payload.table === 'orders' && payload.eventType === 'INSERT') {
            toast({ title: "🔔 طلب جديد", description: "وصل طلب جديد للمتجر!" });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ id, status, userId, orderNumber }: { id: number, status: string, userId?: string, orderNumber?: number }) => {
      const { error } = await supabase.from('orders').update({ status }).eq('id', id);
      if (error) throw error;

      // If we have a userId, create a notification
      if (userId) {
        let title = "تحديث حالة الطلب #";
        let message = "";

        const statusMap: Record<string, string> = {
          pending: "قيد الانتظار",
          preparing: "جاري التجهيز",
          shipping: "في الطريق إليك 🚚",
          completed: "تم التوصيل بنجاح ✅",
          cancelled: "تم إلغاء الطلب ❌"
        };

        message = `تم تحديث حالة طلبك رقم ${orderNumber || id} إلى: ${statusMap[status] || status}`;

        await supabase.from('notifications').insert([{
          user_id: userId,
          title: title + (orderNumber || id),
          message: message,
          is_read: false
        }]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: "تم تحديث حالة الطلب وإشعار العميل" });
    }
  });

  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isInvoiceChoiceOpen, setIsInvoiceChoiceOpen] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState<any>(null);

  const getPremiumInvoiceHtml = (order: any, type: 'a4' | 'receipt') => {
    const items = order.order_items || [];
    const date = new Date(order.created_at || order.createdAt).toLocaleString('ar-SA');

    const itemsHtml = items.map((item: any) => `
      <div class="item-row">
        <div class="item-main">
          <span class="item-name">${item.productName || item.product_name || 'منتج'}</span>
          <span class="item-qty">x${item.quantity || 1}</span>
        </div>
        <div class="item-details">
          ${item.cutting ? `<span>تقطيع: ${item.cutting}</span>` : ''}
          ${item.packaging ? `<span>تغليف: ${item.packaging}</span>` : ''}
        </div>
        <div class="item-price-box">
          <span class="unit-price">${item.price || 0} ر.س</span>
          <span class="total-price">${((item.price || 0) * (item.quantity || 1)).toFixed(2)} ر.س</span>
        </div>
      </div>
    `).join('');

    const deliveryFee = order.deliveryFee || 0;
    const discountAmount = order.discountAmount || 0;
    const itemsTotal = items.reduce((acc: number, item: any) => acc + ((item.price || 0) * (item.quantity || 1)), 0);
    // Subtotal in DB is items total pre-Vat, but if not set we use itemsTotal
    const vatRate = 0.15;
    const subtotalPreVat = (order.subtotalAmount ? order.subtotalAmount / (1 + vatRate) : itemsTotal / (1 + vatRate)).toFixed(2);
    const tax = (parseFloat(subtotalPreVat) * vatRate).toFixed(2);

    // Percentage for discount display
    const discountPercent = order.subtotalAmount && discountAmount > 0
      ? Math.round((discountAmount / order.subtotalAmount) * 100)
      : 0;

    if (type === 'receipt') {
      return `
        <html dir="rtl">
          <head>
            <style>
              @page { margin: 0; }
              body { font-family: 'Segoe UI', Arial; width: 80mm; margin: 0 auto; color: #000; padding: 5mm; font-size: 12px; line-height: 1.4; }
              .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 5mm; margin-bottom: 5mm; }
              .logo { font-size: 18px; font-weight: 900; margin-bottom: 2mm; }
              .title { font-size: 14px; font-weight: bold; }
              .info { margin-bottom: 5mm; border-bottom: 1px dashed #000; padding-bottom: 3mm; }
              .item-row { margin-bottom: 3mm; padding-bottom: 2mm; border-bottom: 0.5px solid #eee; }
              .item-main { display: flex; justify-content: space-between; font-weight: bold; }
              .item-details { font-size: 10px; color: #666; }
              .totals { margin-top: 5mm; }
              .total-row { display: flex; justify-content: space-between; margin-bottom: 1mm; }
              .grand-total { font-size: 16px; font-weight: 900; border-top: 1px solid #000; padding-top: 2mm; margin-top: 2mm; }
              .qr-box { text-align: center; margin-top: 8mm; }
              .footer { text-align: center; margin-top: 10mm; font-size: 10px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">ملحمة النعيمي الفاخر</div>
              <div class="title">إيصال ضريبي مبسط</div>
              <div style="font-size: 10px;">رقم ضريبي: 300012345600003</div>
            </div>
            <div class="info">
              <div>رقم الطلب: #${order.id}</div>
              <div>التاريخ: ${date}</div>
              <div>العميل: ${order.customerName || order.customer_name}</div>
              <div>الهاتف: ${order.customerPhone || order.customer_phone}</div>
            </div>
            <div class="items">
              ${itemsHtml}
            </div>
            <div class="totals">
              <div class="total-row"><span>المجموع الفرعي (قبل الضريبة):</span> <span>${subtotalPreVat} ر.س</span></div>
              <div class="total-row"><span>الضريبة (15%):</span> <span>${tax} ر.س</span></div>
              ${discountAmount > 0 ? `<div class="total-row" style="color: #e11d48;"><span>خصم (${discountPercent}%):</span> <span>-${discountAmount.toFixed(2)} ر.س</span></div>` : ''}
              <div class="total-row" style="color: #666;"><span>رسوم التوصيل:</span> <span>${deliveryFee} ر.س</span></div>
              <div class="total-row grand-total"><span>الإجمالي النهائي:</span> <span>${order.total} ر.س</span></div>
            </div>
            <div class="qr-box">
              <div style="width: 80px; hieght: 80px; background: #000; margin: 0 auto; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 8px;">QR CODE</div>
            </div>
            <div class="footer">شكراً لزيارتكم</div>
            <script>window.onload = () => { window.print(); window.close(); }</script>
          </body>
        </html>
      `;
    }

    // A4 Premium Design
    return `
      <html dir="rtl">
        <head>
          <title>فاتورة #${order.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
            body { font-family: 'Cairo', sans-serif; margin: 0; padding: 0; background: #fff; color: #1a1c2c; }
            .container { max-width: 800px; margin: 40px auto; padding: 60px; background: #fff; position: relative; overflow: hidden; }
            .gold-bar { position: absolute; top: 0; left: 0; right: 0; height: 10px; background: linear-gradient(90deg, #D4AF37, #F9D976); }
            .invoice-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 60px; }
            .logo-box h1 { margin: 0; font-size: 32px; font-weight: 900; color: #1a1c2c; letter-spacing: -1px; }
            .logo-box p { margin: 5px 0 0; color: #D4AF37; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; }
            .invoice-meta { text-align: left; }
            .invoice-meta h2 { margin: 0; font-size: 48px; color: #eee; position: absolute; left: 60px; top: 80px; z-index: 0; opacity: 0.5; }
            .meta-details { position: relative; z-index: 1; }
            .meta-row { display: flex; justify-content: flex-end; gap: 20px; margin-bottom: 5px; font-size: 14px; }
            .meta-label { color: #888; font-weight: bold; }
            .meta-value { font-weight: 900; }
            
            .client-grid { display: grid; grid-cols: 2; gap: 40px; margin-bottom: 60px; border-top: 1px solid #eee; border-bottom: 1px solid #eee; padding: 30px 0; }
            .info-block h4 { margin: 0 0 15px; font-size: 12px; color: #D4AF37; text-transform: uppercase; tracking: 2px; }
            .info-block p { margin: 0; font-size: 16px; font-weight: 700; line-height: 1.6; }
            
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            .items-table th { text-align: right; padding: 20px; background: #1a1c2c; color: #fff; font-size: 14px; }
            .items-table th:last-child { text-align: left; }
            .items-table td { padding: 25px 20px; border-bottom: 1px solid #f5f5f5; vertical-align: top; }
            .item-name { display: block; font-weight: 900; font-size: 18px; margin-bottom: 5px; }
            .item-opts { display: block; font-size: 12px; color: #888; }
            .price-col { font-weight: 900; font-size: 16px; }
            
            .summary-section { display: flex; justify-content: space-between; align-items: flex-end; }
            .qr-placeholder { width: 120px; height: 120px; background: #f9f9f9; border: 1px solid #eee; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #ccc; flex-direction: column; }
            .totals-box { width: 300px; }
            .total-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f9f9f9; }
            .total-row.grand { border-top: 2px solid #1a1c2c; border-bottom: none; margin-top: 10px; padding-top: 20px; }
            .grand .label { font-size: 20px; font-weight: 900; }
            .grand .value { font-size: 24px; font-weight: 900; color: #D4AF37; }
            
            .footer { margin-top: 80px; text-align: center; font-size: 12px; color: #aaa; border-top: 1px solid #f9f9f9; padding-top: 40px; }
            
            @media print {
              .container { margin: 0; width: 100%; max-width: none; padding: 30px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="gold-bar"></div>
            <div class="invoice-header">
              <div class="logo-box">
                <h1>ملحمة النعيمي</h1>
                <p>Luxury Butchery</p>
              </div>
              <div class="invoice-meta">
                <h2>INVOICE</h2>
                <div class="meta-details">
                  <div class="meta-row"><span class="meta-label">ID #</span><span class="meta-value">${order.id}</span></div>
                  <div class="meta-row"><span class="meta-label">التاريخ</span><span class="meta-value">${date}</span></div>
                </div>
              </div>
            </div>

            <div style="display: flex; gap: 80px; margin-bottom: 60px;">
              <div class="info-block">
                <h4>مُقدّم من</h4>
                <p>ملحمة النعيمي الفاخر<br/>الرياض، المملكة العربية السعودية<br/>الرقم الضريبي: 300012345600003</p>
              </div>
              <div class="info-block">
                <h4>مُقدّم إلى</h4>
                <p>${order.customerName || order.customer_name}<br/>${order.customerPhone}<br/>${order.address}</p>
              </div>
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th>الوصف</th>
                  <th style="text-align: center;">الكمية</th>
                  <th style="text-align: center;">السعر</th>
                  <th style="text-align: left;">المجموع</th>
                </tr>
              </thead>
              <tbody>
                ${items.map((item: any) => `
                  <tr>
                    <td>
                      <span class="item-name">${item.productName || item.product_name || 'منتج'}</span>
                      <span class="item-opts">
                        ${item.cutting ? `تقطيع: ${item.cutting}` : ''} 
                        ${item.packaging ? ` | تغليف: ${item.packaging}` : ''}
                      </span>
                    </td>
                    <td style="text-align: center;" class="price-col">${item.quantity || 1}</td>
                    <td style="text-align: center;" class="price-col">${item.price} ر.س</td>
                    <td style="text-align: left;" class="price-col">${((item.price || 0) * (item.quantity || 1)).toFixed(2)} ر.س</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="summary-section">
              <div class="qr-placeholder">
                <svg width="60" height="60" viewBox="0 0 24 24" fill="#D4AF37"><path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v2h-3v-2zm-3 0h2v2h-2v-2zm3 3h3v2h-3v-2zm-3 0h2v2h-2v-2zm3 3h3v2h-3v-2zm-3 0h2v2h-2v-2z" /></svg>
                <div style="margin-top: 5px; font-weight: bold; color: #1a1c2c;">ZATCA Verified</div>
              </div>
              <div class="totals-box">
                <div class="total-row">
                  <span class="label">المجموع (بدون الضريبة):</span>
                  <span class="value">${subtotalPreVat} ر.س</span>
                </div>
                <div class="total-row">
                  <span class="label">ضريبة القيمة المضافة (15%):</span>
                  <span class="value">${tax} ر.س</span>
                </div>
                ${discountAmount > 0 ? `
                <div class="total-row" style="color: #e11d48;">
                  <span class="label">مبلغ الخصم (${discountPercent}%):</span>
                  <span class="value">-${discountAmount.toFixed(2)} ر.س</span>
                </div>` : ''}
                <div class="total-row">
                  <span class="label">رسوم التوصيل:</span>
                  <span class="value">${deliveryFee} ر.س</span>
                </div>
                <div class="total-row grand">
                  <span class="label">الإجمالي النهائي:</span>
                  <span class="value">${order.total} ر.س</span>
                </div>
              </div>
            </div>

            <div class="footer">
              نتمنى أن نكون قد نلنا استحسانكم. شكراً جزيلاً لثقتكم بملحمة النعيمي الفاخر.
            </div>
          </div>
          <script>window.onload = () => { setTimeout(() => { window.print(); }, 500); }</script>
        </body>
      </html>
    `;
  };

  const handlePrint = (order: any, type: 'a4' | 'receipt' | 'view' = 'a4') => {
    if (!order) return;

    if (type === 'view') {
      const html = getPremiumInvoiceHtml(order, 'a4');
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html.replace('window.print();', '')); // Remove auto-print for viewing
        win.document.close();
      }
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(getPremiumInvoiceHtml(order, type));
    printWindow.document.close();
  };

  const { data: usersList = [] } = useQuery<User[]>({
    queryKey: ["admin_users"],
    queryFn: async () => {
      const { data, error } = await supabase.from('users').select('*');
      if (error) throw error;
      return (data || []).map(u => ({
        ...u,
        isBanned: u.is_banned === true,
        isAdmin: u.is_admin === true
      })) as User[];
    }
  });

  const { data: coupons = [] } = useQuery<Coupon[]>({
    queryKey: ["coupons"],
    queryFn: async () => {
      const { data, error } = await supabase.from('coupons').select('*');
      if (error) throw error;
      return (data || []).map(c => ({
        ...c,
        discountType: c.discount_type || c.discountType,
        discountValue: c.discount_value || c.discountValue,
        minOrderAmount: c.min_order_amount || c.minOrderAmount || 0,
        maxUsage: c.max_usage || c.maxUsage,
        usedCount: c.used_count || c.usedCount || 0,
        userTier: c.user_tier || c.userTier,
        applicableProducts: c.applicable_products || c.applicableProducts,
        expiryDate: c.expiry_date || c.expiryDate
      })) as Coupon[];
    }
  });

  const { data: offers = [] } = useQuery<Offer[]>({
    queryKey: ["offers"],
    queryFn: async () => {
      const { data, error } = await supabase.from('offers').select('*');
      if (error) throw error;
      return (data || []).map(o => ({
        ...o,
        discountPercentage: o.discount_percentage ?? o.discountPercentage,
        imageUrl: o.image_url || o.imageUrl,
        productId: o.product_id || o.productId,
        isActive: o.is_active ?? o.isActive ?? true
      })) as Offer[];
    }
  });

  const { data: deliveryZones = [] } = useQuery<DeliveryZone[]>({
    queryKey: ["delivery_zones"],
    queryFn: async () => {
      const { data, error } = await supabase.from('delivery_zones').select('*');
      if (error) throw error;
      return (data || []).map(z => ({
        ...z,
        isActive: z.is_active !== false,
        minOrder: z.min_order ?? z.minOrder,
        driver_commission: z.driver_commission,
        driverCommission: z.driver_commission ?? z.driverCommission ?? 0,
        fee: z.fee ?? 0
      })) as DeliveryZone[];
    }
  });

  const { data: attributes = [] } = useQuery<ProductAttribute[]>({
    queryKey: ["product_attributes"],
    queryFn: async () => {
      const { data, error } = await supabase.from('product_attributes').select('*');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: siteSettings = [] } = useQuery<SiteSettings[]>({
    queryKey: ["site_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from('site_settings').select('*');
      if (error) throw error;
      return data || [];
    }
  });

  const settingsMap = useMemo(() => {
    return siteSettings.reduce((acc, curr) => {
      try {
        acc[curr.key] = JSON.parse(curr.value);
      } catch (e) {
        acc[curr.key] = curr.value;
      }
      return acc;
    }, {} as Record<string, any>);
  }, [siteSettings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const promises = Object.entries(updates).map(([key, value]) => {
        return supabase.from('site_settings').upsert({
          key,
          value: JSON.stringify(value)
        });
      });
      const results = await Promise.all(promises);
      const error = results.find(r => r.error);
      if (error) throw error.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site_settings"] });
      toast({ title: "تم حفظ الإعدادات بنجاح" });
    }
  });

  const { data: driversList = [] } = useQuery<Driver[]>({
    queryKey: ["drivers"],
    queryFn: async () => {
      const { data, error } = await supabase.from('drivers').select('*');
      if (error) throw error;
      return data || [];
    }
  });

  // --- State for Forms ---
  const [isStaffDialogOpen, setIsStaffDialogOpen] = useState(false);
  const [isStaffDetailsOpen, setIsStaffDetailsOpen] = useState(false);
  const [selectedStaffDetails, setSelectedStaffDetails] = useState<Staff | null>(null);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [creationMode, setCreationMode] = useState<"new" | "existing">("new");
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [staffForm, setStaffForm] = useState({
    name: "",
    phone: "",
    role: "butcher",
    username: "",
    password: "",
    email: "",
    userId: "",
    permissions: [] as string[]
  });

  const { data: staffList = [] } = useQuery<Staff[]>({
    queryKey: ["staff"],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff').select('*');
      if (error) throw error;
      return (data || []).map(s => ({
        ...s,
        userId: s.user_id || s.userId,
        isActive: s.is_active !== false,
        joinedAt: s.joined_at || s.joinedAt
      })) as Staff[];
    }
  });

  const { data: butcherInventoryLogs = [] } = useQuery<ButcherInventoryLog[]>({
    queryKey: ["butcher_inventory_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('butcher_inventory_logs')
        .select('*')
        .order('id', { ascending: false });
      if (error) throw error;
      return (data || []).map(l => ({
        ...l,
        productId: l.product_id,
        staffId: l.staff_id,
        oldQuantity: l.old_quantity,
        newQuantity: l.new_quantity,
        oldPrice: l.old_price,
        newPrice: l.new_price,
        actionType: l.action_type,
        createdAt: l.created_at
      })) as ButcherInventoryLog[];
    },
    enabled: activeTab === "staff" || isStaffDetailsOpen
  });

  const { data: recentUsers = [], isLoading: isUsersLoading } = useQuery<any[]>({
    queryKey: ["recent_users"],
    queryFn: async () => {
      console.log("🔄 [DEBUG-CLIENT] Fetching users directly from Supabase...");
      const { data, error } = await supabase
        .from('users')
        .select('id, username, email, phone, role')
        .order('id', { ascending: false });

      if (error) {
        console.error("❌ [DEBUG-CLIENT] Supabase fetch error:", error.message);
        throw error;
      }
      console.log(`✅ [DEBUG-CLIENT] Fetched ${data?.length || 0} users from Supabase`);
      return data || [];
    },
    enabled: isStaffDialogOpen
  });

  const updateOrderDriverMutation = useMutation({
    mutationFn: async ({ id, driverId }: { id: number, driverId: number | null }) => {
      const { error } = await supabase.from('orders').update({ driver_id: driverId }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: "تم تعيين السائق الخارجي بنجاح" });
    }
  });

  const updateOrderAssignmentsMutation = useMutation({
    mutationFn: async ({ id, butcherStaffId, driverStaffId }: { id: number, butcherStaffId?: number | null, driverStaffId?: number | null }) => {
      const updates: any = {};
      if (butcherStaffId !== undefined) updates.butcher_staff_id = butcherStaffId;
      if (driverStaffId !== undefined) updates.driver_staff_id = driverStaffId;

      const { error } = await supabase.from('orders').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: "تم تحديث تعيينات الموظفين" });
    }
  });

  // --- Auth Check ---
  useEffect(() => {
    // If not logged in or not admin, redirect
    if (!user || user.isAdmin === false) {
      // Note: checking explicit false because checks might be async
      if (user && !user.isAdmin) {
        setLocation("/");
        toast({ title: "غير مصرح", description: "ليس لديك صلاحية دخول لوحة الإدارة", variant: "destructive" });
      }
    }
  }, [user, setLocation, toast]);

  const handleLogout = () => {
    logoutMutation.mutate();
    setLocation("/auth");
  };

  // --- State for Forms ---
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Product Form State
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    unit: "ذبيحة",
    customUnit: "",
    description: "",
    categoryId: "lamb",
    image: "",
    isFeatured: false,
    isActive: true,
    badge: "",
    imageObjectPosition: "object-center",
    stockQuantity: "0",
    isOutOfStock: false,
    hasCutting: false,
    hasPackaging: false,
    hasExtras: false
  });

  // Marketing Form States
  const [isCouponDialogOpen, setIsCouponDialogOpen] = useState(false);
  const [isOfferDialogOpen, setIsOfferDialogOpen] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: "",
    discountType: "percentage",
    discountValue: "",
    minOrderAmount: "0",
    maxUsage: "",
    expiryDate: "",
    userTier: "all",
    applicableProducts: "all"
  });
  const [offerForm, setOfferForm] = useState({
    title: "",
    description: "",
    discountPercentage: "",
    imageUrl: "",
    type: "banner",
    productId: "none"
  });

  const [isZoneDialogOpen, setIsZoneDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<any>(null);
  const [zoneForm, setZoneForm] = useState({ name: "", fee: "0", driverCommission: "0", minOrder: "0", coordinates: "" });

  const [messageDialog, setMessageDialog] = useState<{ open: boolean, user: User | null }>({ open: false, user: null });
  const [messageText, setMessageText] = useState("");

  // Create Category State
  const [newCategory, setNewCategory] = useState({ id: "", name: "", icon: "", image: "" });
  const [isEditingCategory, setIsEditingCategory] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const availablePermissions = [
    { id: "orders", label: "إدارة الطلبات", icon: ShoppingBag },
    { id: "products", label: "إدارة المنتجات", icon: Package },
    { id: "categories", label: "إدارة التصنيفات", icon: FolderTree },
    { id: "marketing", label: "التسويق والعروض", icon: Megaphone },
    { id: "reports", label: "التقارير والإحصائيات", icon: BarChart3 },
    { id: "staff", label: "إدارة الموظفين", icon: Users },
    { id: "settings", label: "إعدادات المتجر", icon: Settings },
    { id: "delivery_zones", label: "مناطق التوصيل", icon: MapPin },
  ];

  const saveStaffMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: staffForm.name,
        phone: staffForm.phone,
        role: staffForm.role,
        permissions: staffForm.permissions,
        is_active: true
      };

      if (editingStaff) {
        const { error } = await supabase.from('staff').update(payload).eq('id', editingStaff.id);
        if (error) throw error;
      } else if (creationMode === "existing" && staffForm.userId) {
        // Promote existing user
        const res = await fetch("/api/admin/promote-staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: staffForm.userId,
            name: staffForm.name,
            phone: staffForm.phone,
            role: staffForm.role,
            permissions: staffForm.permissions
          })
        });

        if (!res.ok) {
          const errorJson = await res.json();
          throw new Error(errorJson.message || "فشل في ترقية المستخدم");
        }
      } else {
        // Validate required fields for new staff
        if (!staffForm.name || !staffForm.phone) {
          throw new Error("الاسم ورقم الجوال مطلوبان");
        }

        if (!staffForm.username) {
          throw new Error("اسم المستخدم مطلوب");
        }

        if (!staffForm.password) {
          throw new Error("كلمة المرور مطلوبة");
        }

        if (!staffForm.email) {
          throw new Error("البريد الإلكتروني مطلوب");
        }

        console.log("📤 [STAFF-FORM] Sending request to create staff:", {
          username: staffForm.username,
          name: staffForm.name,
          role: staffForm.role
        });

        // Use the secure server API for creation so password gets hashed
        const res = await fetch("/api/admin/create-staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: staffForm.username,
            password: staffForm.password,
            email: staffForm.email,
            phone: staffForm.phone,
            name: staffForm.name,
            role: staffForm.role,
            permissions: staffForm.permissions
          })
        });

        console.log("📥 [STAFF-FORM] Response status:", res.status);

        if (!res.ok) {
          // Try to parse as JSON first
          let errorMessage = "فشل في إنشاء حساب الموظف";
          try {
            const errorJson = await res.json();
            errorMessage = errorJson.message || errorMessage;
          } catch (e) {
            // If JSON parsing fails, try text
            try {
              errorMessage = await res.text();
            } catch (textError) {
              console.error("❌ [STAFF-FORM] Could not parse error response");
            }
          }
          console.error("❌ [STAFF-FORM] Error response:", errorMessage);
          throw new Error(errorMessage);
        }

        const data = await res.json();
        console.log("✅ [STAFF-FORM] Staff created successfully:", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["recent_users"] });
      setIsStaffDialogOpen(false);
      setEditingStaff(null);
      setStaffForm({ name: "", phone: "", role: "butcher", username: "", password: "", email: "", userId: "", permissions: [] });
      toast({ title: editingStaff ? "تم تحديث بيانات الموظف" : "تم إضافة الموظف بنجاح" });
    },
    onError: (e: any) => {
      console.error("💥 [STAFF-FORM] Mutation error:", e);
      toast({ title: "فشل الحفظ", description: e.message, variant: "destructive" });
    }
  });


  const deleteStaffMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('staff').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast({ title: "تم حذف الموظف بنجاح" });
    }
  });

  // --- Optimized Data Calculations ---
  const usersWithInsights = useMemo(() => {
    return usersList.map(u => {
      const customerOrders = orders.filter(o => o.userId === u.id);
      const totalSpend = customerOrders.reduce((acc, o) => acc + (parseFloat(o.total as any) || 0), 0);
      return {
        ...u,
        orderCount: customerOrders.length,
        totalSpend,
        isVIP: customerOrders.length > 5,
        isGold: customerOrders.length > 3 && customerOrders.length <= 5,
        lastOrder: (customerOrders[0] as any)?.createdAt || (customerOrders[0] as any)?.created_at
      };
    });
  }, [usersList, orders]);

  const stats = useMemo(() => ({
    totalSales: orders.reduce((acc, o) => acc + (parseFloat(o.total as any) || 0), 0),
    orderCount: orders.length,
    pendingOrders: orders.filter(o => o.status === 'pending').length,
    activeProducts: products.length,
    categoryCount: categories.length,
    vipCount: usersWithInsights.filter(u => u.isVIP).length,
    bannedCount: usersList.filter(u => u.isBanned).length
  }), [orders, products, categories, usersWithInsights, usersList]);

  // --- Helpers ---
  const resetProductForm = () => {
    setFormData({
      name: "",
      price: "",
      unit: "ذبيحة",
      customUnit: "",
      description: "",
      categoryId: "lamb",
      image: "",
      isFeatured: false,
      isActive: true,
      badge: "",
      imageObjectPosition: "object-center",
      stockQuantity: "0",
      isOutOfStock: false,
      hasCutting: false,
      hasPackaging: false,
      hasExtras: false
    });
    setEditingProduct(null);
    setImageFile(null);
  };

  const handleEditClick = (product: Product) => {
    setImageFile(null); // Clear any previous selection
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      unit: ["ذبيحة", "كيلو", "نصف", "طبق"].includes(product.unit) ? product.unit : "other",
      customUnit: ["ذبيحة", "كيلو", "نصف", "طبق"].includes(product.unit) ? "" : product.unit,
      description: product.description,
      categoryId: product.categoryId,
      image: product.image,
      isFeatured: product.isFeatured || false,
      isActive: product.isActive !== false,
      badge: product.badge || "",
      imageObjectPosition: product.imageObjectPosition || "object-center",
      stockQuantity: (product.stockQuantity || 0).toString(),
      isOutOfStock: product.isOutOfStock || false,
      hasCutting: (product as any).has_cutting || false,
      hasPackaging: (product as any).has_packaging || false,
      hasExtras: (product as any).has_extras || false
    });
    setIsProductDialogOpen(true);
  };

  // --- Mutations ---
  const uploadImage = async (file: File, folder: string = 'products') => {
    const bucketName = 'image Meat butchery';
    const MAX_SIZE_KB = 199;
    const MAX_SIZE_BYTES = MAX_SIZE_KB * 1024;

    console.log(`📏 [IMAGE_PROCESS] Original size: ${(file.size / 1024).toFixed(2)} KB, Folder: ${folder}`);

    // Helper to compress image using Canvas
    const compressImage = async (imageFile: File): Promise<Blob> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(imageFile);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target?.result as string;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            const MAX_DIM = 1200;
            if (width > MAX_DIM || height > MAX_DIM) {
              if (width > height) {
                height = Math.round((height * MAX_DIM) / width);
                width = MAX_DIM;
              } else {
                width = Math.round((width * MAX_DIM) / height);
                height = MAX_DIM;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);

            let quality = 0.9;
            const attemptCompression = (q: number) => {
              canvas.toBlob((blob) => {
                if (!blob) {
                  reject(new Error("فشل تحويل الصورة"));
                  return;
                }

                if (blob.size <= MAX_SIZE_BYTES || q <= 0.1) {
                  resolve(blob);
                } else {
                  attemptCompression(q - 0.1);
                }
              }, 'image/jpeg', q);
            };

            attemptCompression(quality);
          };
          img.onerror = () => reject(new Error("فشل تحميل الصورة للمعالجة"));
        };
        reader.onerror = () => reject(new Error("فشل قراءة الملف"));
      });
    };

    let fileToUpload: Blob | File = file;

    try {
      fileToUpload = await compressImage(file);
    } catch (err) {
      console.error("⚠️ [IMAGE_PROCESS] Compression failed:", err);
    }

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, "_").replace(/\.[^/.]+$/, "") + ".jpg";
    const filePath = `${folder}/${timestamp}-${safeName}`;

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, fileToUpload, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/jpeg'
      });

    if (error) {
      throw new Error(`فشل الرفع: ${error.message}`);
    }

    const { data: qData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return qData.publicUrl;
  };

  const saveProductMutation = useMutation({
    mutationFn: async () => {
      setIsUploading(true);
      let imageUrl = formData.image;

      if (imageFile) {
        console.log("📤 Uploading new image file:", imageFile.name);
        try {
          imageUrl = await uploadImage(imageFile);
          console.log("✅ Image uploaded successfully:", imageUrl);
        } catch (e: any) {
          console.error("❌ Image upload failed:", e);
          setIsUploading(false);
          toast({ title: "فشل رفع الصورة", description: e.message, variant: "destructive" });
          throw e; // Stop execution
        }
      }

      const finalUnit = formData.unit === "other" ? formData.customUnit : formData.unit;

      // Map camelCase to snake_case for Supabase
      const productPayload = {
        name: formData.name,
        price: parseFloat(formData.price) || 0,
        unit: finalUnit,
        description: formData.description,
        category_id: formData.categoryId,
        image: imageUrl || "/assets/hero-meat.png",
        is_featured: formData.isFeatured,
        is_active: formData.isActive,
        badge: formData.badge,
        image_object_position: formData.imageObjectPosition || (editingProduct?.imageObjectPosition) || "object-center",
        stock_quantity: parseInt(formData.stockQuantity) || 0,
        is_out_of_stock: formData.isOutOfStock,
        has_cutting: formData.hasCutting,
        has_packaging: formData.hasPackaging,
        has_extras: formData.hasExtras
      };

      try {
        if (editingProduct) {
          console.log("🔄 Updating product via Supabase:", editingProduct.id, productPayload);
          const { error } = await supabase
            .from('products')
            .update(productPayload)
            .eq('id', editingProduct.id);
          if (error) throw error;
        } else {
          console.log("🆕 Inserting new product via Supabase:", productPayload);
          const { error } = await supabase
            .from('products')
            .insert([productPayload]);
          if (error) throw error;
        }

        console.log("✅ [CLIENT] Product saved successfully");
      } catch (err: any) {
        console.error("❌ [CLIENT] Save failed:", err);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setIsProductDialogOpen(false);
      resetProductForm();
      toast({ title: editingProduct ? "تم تحديث المنتج" : "تم إضافة المنتج" });
    },
    onError: (e) => {
      setIsUploading(false);
      toast({ title: "حدث خطأ", description: e.message, variant: "destructive" });
    }
  });

  const addCategoryMutation = useMutation({
    mutationFn: async () => {
      if (!newCategory.id || !newCategory.name) throw new Error("ID and Name are required");

      setIsUploading(true);
      let catImageUrl = newCategory.image;

      if (imageFile) {
        try {
          catImageUrl = await uploadImage(imageFile, 'categories');
        } catch (e: any) {
          setIsUploading(false);
          throw e;
        }
      }

      const { data: existing } = await supabase.from('categories').select('id').eq('id', newCategory.id).single();

      if (existing) {
        const { error } = await supabase.from('categories').update({
          name: newCategory.name,
          icon: newCategory.icon || "📦",
          image: catImageUrl
        }).eq('id', newCategory.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('categories').insert([{
          id: newCategory.id,
          name: newCategory.name,
          icon: newCategory.icon || "📦",
          image: catImageUrl
        }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setIsCategoryDialogOpen(false);
      setNewCategory({ id: "", name: "", icon: "", image: "" });
      setImageFile(null);
      setIsUploading(false);
      toast({ title: "تم حفظ التصنيف بنجاح" });
    },
    onError: (e) => {
      setIsUploading(false);
      toast({ title: "فشل حفظ التصنيف", description: e.message, variant: "destructive" });
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "تم حذف المنتج" });
    }
  });

  const banUserMutation = useMutation({
    mutationFn: async ({ id, isBanned }: { id: string, isBanned: boolean }) => {
      const { error } = await supabase.from('users').update({ is_banned: isBanned }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
      toast({ title: "تم تحديث حالة المستخدم" });
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ userId, title, message }: { userId: string, title: string, message: string }) => {
      const { error } = await supabase.from('notifications').insert([{ user_id: userId, title, message }]);
      if (error) throw error;
    },
    onSuccess: () => {
      setMessageDialog({ open: false, user: null });
      setMessageText("");
      toast({ title: "تم إرسال الرسالة بنجاح" });
    }
  });

  const [isBroadcastDialogOpen, setIsBroadcastDialogOpen] = useState(false);
  const [broadcastTarget, setBroadcastTarget] = useState<"all" | "admins" | "workers">("all");
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");

  const sendBroadcastMutation = useMutation({
    mutationFn: async () => {
      let targetUsers: User[] = [];
      if (broadcastTarget === "all") targetUsers = usersList;
      else if (broadcastTarget === "admins") targetUsers = usersList.filter(u => u.isAdmin);
      else if (broadcastTarget === "workers") targetUsers = usersList.filter(u => !u.isAdmin && u.username.includes("سائق")); // Heuristics for workers

      const notifications = targetUsers.map(u => ({
        user_id: u.id,
        title: broadcastTitle,
        message: broadcastMessage,
        is_read: false
      }));

      // Split into chunks of 100 for safety
      for (let i = 0; i < notifications.length; i += 100) {
        const chunk = notifications.slice(i, i + 100);
        const { error } = await supabase.from('notifications').insert(chunk);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setIsBroadcastDialogOpen(false);
      setBroadcastTitle("");
      setBroadcastMessage("");
      toast({ title: "تم إرسال البث بنجاح", description: `تم إشعار جميع ${broadcastTarget === 'all' ? 'المستخدمين' : broadcastTarget === 'admins' ? 'المدراء' : 'العاملين'}` });
    }
  });

  const saveCouponMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        code: couponForm.code,
        discount_type: couponForm.discountType,
        discount_value: parseFloat(couponForm.discountValue),
        min_order_amount: parseFloat(couponForm.minOrderAmount),
        max_usage: parseInt(couponForm.maxUsage) || null,
        user_tier: couponForm.userTier,
        applicable_products: couponForm.applicableProducts
      };
      const { error } = await supabase.from('coupons').insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      setIsCouponDialogOpen(false);
      toast({ title: "تم إضافة الكوبون" });
    }
  });

  const saveOfferMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: offerForm.title,
        description: offerForm.description,
        discount_percentage: parseInt(offerForm.discountPercentage) || 0,
        image_url: offerForm.imageUrl,
        type: offerForm.type,
        product_id: (offerForm.productId && offerForm.productId !== "none") ? parseInt(offerForm.productId) : null
      };
      const { error } = await supabase.from('offers').insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      setIsOfferDialogOpen(false);
      toast({ title: "تم إضافة العرض" });
    }
  });

  const saveZoneMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: zoneForm.name,
        fee: parseFloat(zoneForm.fee) || 0,
        driver_commission: parseFloat(zoneForm.driverCommission) || 0,
        min_order: parseFloat(zoneForm.minOrder) || 0,
        coordinates: zoneForm.coordinates, // Already stringified via onChange
        is_active: true
      };


      if (editingZone) {
        const { error } = await supabase.from('delivery_zones').update(payload).eq('id', editingZone.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('delivery_zones').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery_zones"] });
      setIsZoneDialogOpen(false);
      setEditingZone(null);
      setZoneForm({ name: "", fee: "0", driverCommission: "0", minOrder: "0", coordinates: "" });
      toast({ title: editingZone ? "تم تحديث المنطقة" : "تم إضافة منطقة التوصيل بنجاح" });
    },
    onError: (e: any) => {
      toast({ title: "فشل الحفظ", description: `FRONTEND_DIAGNOSTIC: ${e.message}`, variant: "destructive" });
    }
  });

  const handleEditZone = (zone: any) => {
    setEditingZone(zone);
    const coordsStr = zone.coordinates ? (typeof zone.coordinates === 'string' ? zone.coordinates : JSON.stringify(zone.coordinates)) : "";
    setZoneForm({
      name: zone.name || "",
      fee: (zone.fee || 0).toString(),
      driverCommission: (zone.driver_commission || zone.driverCommission || 0).toString(),
      minOrder: (zone.min_order || zone.minOrder || 0).toString(),
      coordinates: coordsStr
    });
    setIsZoneDialogOpen(true);
  };

  // --- Render ---
  const isLoading = productsLoading || ordersLoading;

  const hasAnyPermission = user?.isAdmin || (user?.permissions && user.permissions.length > 0);
  if (!user || (!hasAnyPermission && !isLoading)) return null;

  return (
    <div className="min-h-screen bg-gray-50/50 text-right" dir="rtl">
      {/* Mobile Header */}
      <div className="md:hidden bg-white p-4 border-b flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <h2 className="font-bold text-lg text-primary">لوحة الإدارة</h2>
        <Button variant="ghost" size="icon" onClick={() => setActiveTab("overview")}>
          <LayoutDashboard />
        </Button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-l min-h-screen sticky top-0 hidden md:flex flex-col z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
          <div className="p-8 border-b border-gray-100 flex flex-col items-center">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4">
              <LayoutDashboard size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">لوحة الإدارة</h2>
            <p className="text-xs text-muted-foreground mt-1 bg-gray-100 px-3 py-1 rounded-full">{user.username}</p>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {[
              { id: "reports", icon: BarChart3, label: "التقارير", perm: "reports" },
              { id: "overview", icon: LayoutDashboard, label: "نظرة عامة", perm: "reports" },
              { id: "products", icon: Package, label: "المنتجات", perm: "products" },
              { id: "orders", icon: CreditCard, label: "الطلبات", perm: "orders" },
              { id: "categories", icon: FolderTree, label: "التصنيفات", perm: "categories" },
              { id: "attributes", icon: Scaling, label: "الاضافات", perm: "categories" },
              { id: "delivery", icon: Truck, label: "مناطق التوصيل", perm: "delivery_zones" },
              { id: "customers", icon: Users, label: "العملاء", perm: "staff" },
              { id: "staff", icon: UserCheck, label: "الموظفين", perm: "staff" },
              { id: "marketing", icon: Ticket, label: "العروض والكوبونات", perm: "marketing" },
              { id: "settings", icon: Settings, label: "الإعدادات", perm: "settings" },
            ].filter(item => user?.isAdmin || user?.permissions?.includes(item.perm)).map((item) => (
              <Button
                key={item.id}
                variant={activeTab === item.id ? "default" : "ghost"}
                className={`w-full justify-start gap-3 h-14 text-base font-medium rounded-xl transition-all ${activeTab === item.id
                  ? "shadow-md shadow-primary/20"
                  : "hover:bg-gray-50 text-gray-500"
                  }`}
                onClick={() => setActiveTab(item.id)}
              >
                <item.icon className={`h-5 w-5 ${activeTab === item.id ? "" : "text-gray-400"}`} /> {item.label}
              </Button>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-100">
            <Button variant="destructive" className="w-full justify-start gap-3 h-12 rounded-xl" onClick={handleLogout}>
              <LogOut className="h-5 w-5" /> تسجيل الخروج
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 md:p-8 overflow-x-hidden">
          {activeTab === "overview" && (
            <div className="space-y-8 animate-in fade-in-50 duration-500">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 font-heading">لوحة المعلومات</h1>
                  <p className="text-muted-foreground mt-1">ملخص أداء المتجر والنشاطات الأخيرة</p>
                </div>
                <Button onClick={() => setActiveTab("products")} className="rounded-full px-6">إدارة المنتجات</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="shadow-lg shadow-primary/5 border-none bg-gradient-to-br from-primary to-primary/90 text-primary-foreground relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-x-10 -translate-y-10"></div>
                  <CardHeader className="pb-2 relative">
                    <CardTitle className="text-lg font-medium opacity-90 flex items-center gap-2">
                      <CreditCard className="w-5 h-5" /> إجمالي المبيعات
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="text-4xl font-bold tracking-tight">
                      {stats.totalSales.toLocaleString()} <span className="text-xl">﷼</span>
                    </div>
                    <p className="text-sm opacity-75 mt-2 bg-white/20 inline-block px-2 py-1 rounded-lg">{stats.orderCount} طلبات مكتملة</p>
                  </CardContent>
                </Card>

                <Card className="shadow-lg shadow-gray-200/50 border-none bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium text-gray-500 flex items-center gap-2">
                      <Package className="w-5 h-5" /> المنتجات النشطة
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-gray-900">{stats.activeProducts}</div>
                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                      <Check className="w-3 h-3" /> {stats.categoryCount} تصنيفات نشطة
                    </p>
                  </CardContent>
                </Card>

                <Card className="shadow-lg shadow-gray-200/50 border-none bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium text-gray-500 flex items-center gap-2">
                      <Users className="w-5 h-5" /> الطلبات المعلقة
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-gray-900">
                      {stats.pendingOrders}
                    </div>
                    <p className="text-xs text-orange-600 mt-2 font-medium">تنتظر المراجعة الآن ⚡</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "products" && (
            <div className="space-y-6 animate-in fade-in-50 duration-500">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 font-heading">المنتجات</h1>
                  <p className="text-muted-foreground mt-1">إضافة وتعديل وحذف منتجات المتجر</p>
                </div>
                <div className="flex gap-2">
                  <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2 rounded-xl h-12">
                        تصنيف جديد <Plus className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent dir="rtl">
                      <DialogHeader>
                        <DialogTitle>إضافة تصنيف جديد</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>معرف التصنيف (ID English)</Label>
                          <Input placeholder="مثال: camel" value={newCategory.id} onChange={e => setNewCategory({ ...newCategory, id: e.target.value })} />
                          <p className="text-[10px] text-muted-foreground">يستحسن استخدام أحرف إنجليزية صغيرة بدون مسافات</p>
                        </div>
                        <div className="space-y-2">
                          <Label>اسم التصنيف</Label>
                          <Input placeholder="مثال: حاشي" value={newCategory.name} onChange={e => setNewCategory({ ...newCategory, name: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>أيقونة (إيموجي)</Label>
                          <Input placeholder="🐪" value={newCategory.icon} onChange={e => setNewCategory({ ...newCategory, icon: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>صورة التصنيف</Label>
                            <div className="border border-dashed rounded-lg p-3 text-center hover:bg-muted/10 cursor-pointer relative">
                              <Input
                                type="file"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) setImageFile(e.target.files[0]);
                                }}
                              />
                              {imageFile ? (
                                <p className="text-xs text-green-600 font-bold">تم اختيار ملف: {imageFile.name}</p>
                              ) : newCategory.image ? (
                                <img src={newCategory.image} className="h-10 mx-auto object-contain" />
                              ) : (
                                <p className="text-[10px] text-muted-foreground mt-1 text-center">شامل ضريبة القيمة المضافة 15%</p>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground">سيتم الحفظ في مجلد categories</p>
                          </div>
                          <div className="space-y-2">
                            <Label>رابط صورة (اختياري)</Label>
                            <Input placeholder="/images/..." value={newCategory.image} onChange={e => setNewCategory({ ...newCategory, image: e.target.value })} />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={() => addCategoryMutation.mutate()} disabled={addCategoryMutation.isPending || isUploading}>
                          {isUploading ? <Loader2 className="animate-spin h-4 w-4" /> : "حفظ التصنيف"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={isProductDialogOpen} onOpenChange={(open) => {
                    setIsProductDialogOpen(open);
                    if (!open) resetProductForm();
                  }}>
                    <DialogTrigger asChild>
                      <Button className="gap-2 rounded-xl h-12 shadow-lg shadow-primary/25">
                        منتج جديد <Plus className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl" dir="rtl">
                      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 text-white relative overflow-hidden shrink-0">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        <div className="relative z-10 flex items-center gap-4">
                          <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md">
                            <Package className="w-8 h-8 text-primary" />
                          </div>
                          <div>
                            <DialogTitle className="text-3xl font-black">{editingProduct ? "تحديث بيانات المنتج" : "إضافة منتج جديد"}</DialogTitle>
                            <DialogDescription className="text-slate-400 font-medium mt-1">قم بتعبئة تفاصيل المنتج بعناية لتظهر بشكل رائع للعملاء</DialogDescription>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 overflow-hidden bg-slate-50/50">
                        <ScrollArea className="h-full">
                          <div className="p-8">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                              {/* Left Column: Media & Status */}
                              <div className="lg:col-span-5 space-y-8">
                                <div className="space-y-4">
                                  <Label className="text-lg font-black text-slate-800 flex items-center gap-2">
                                    <ImageIcon className="w-5 h-5 text-primary" /> صورة المنتج الرئيسية
                                  </Label>
                                  <div className="border-2 border-dashed rounded-[2rem] p-4 text-center hover:bg-white hover:border-primary/50 transition-all cursor-pointer relative group min-h-[300px] flex flex-col justify-center items-center overflow-hidden bg-white/50 border-slate-200">
                                    <Input
                                      type="file"
                                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-[20]"
                                      onChange={(e) => {
                                        if (e.target.files?.[0]) setImageFile(e.target.files[0]);
                                      }}
                                      onClick={(e) => ((e.target as any).value = null)}
                                      accept="image/*"
                                    />
                                    {imageFile || formData.image ? (
                                      <div className="relative w-full h-[260px] rounded-2xl overflow-hidden shadow-xl group/img">
                                        <img src={imageFile ? URL.createObjectURL(imageFile) : formData.image} className={`w-full h-full object-cover ${formData.imageObjectPosition || 'object-center'}`} />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                                          <div className="bg-white/20 p-3 rounded-full backdrop-blur-md">
                                            <ImageIcon className="text-white w-8 h-8" />
                                          </div>
                                          <p className="text-white font-black text-sm">اضغط لتغيير الصورة</p>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col items-center gap-4 py-10">
                                        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                          <ImageIcon size={40} />
                                        </div>
                                        <div className="space-y-1">
                                          <p className="text-lg font-black text-slate-700">رفع صورة المنتج</p>
                                          <p className="text-xs text-slate-400 font-medium tracking-wide">JPG, PNG up to 10MB</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  <Label className="text-sm font-black text-slate-500 uppercase tracking-widest">تمركز الصورة والتركيز</Label>
                                  <Select value={formData.imageObjectPosition} onValueChange={(v) => setFormData({ ...formData, imageObjectPosition: v })}>
                                    <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white shadow-sm font-bold">
                                      <SelectValue placeholder="اختر التركيز" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                                      <SelectItem value="object-center" className="font-bold">المنتصف (افتراضي)</SelectItem>
                                      <SelectItem value="object-top" className="font-bold">الأعلى</SelectItem>
                                      <SelectItem value="object-bottom" className="font-bold">الأسفل</SelectItem>
                                      <SelectItem value="object-left" className="font-bold">اليسار</SelectItem>
                                      <SelectItem value="object-right" className="font-bold">اليمين</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-5">
                                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">إعدادات الظهور</h4>
                                  <div className="space-y-4">
                                    <div className="flex items-center justify-between group">
                                      <div className="space-y-0.5">
                                        <Label htmlFor="isActive" className="text-sm font-black text-slate-700">تفعيل المنتج</Label>
                                        <p className="text-[10px] text-slate-400 font-medium">يظهر المنتج للعملاء في المتجر</p>
                                      </div>
                                      <Switch id="isActive" checked={formData.isActive} onCheckedChange={(c) => setFormData({ ...formData, isActive: c })} />
                                    </div>
                                    <Separator className="bg-slate-50" />
                                    <div className="flex items-center justify-between group">
                                      <div className="space-y-0.5">
                                        <Label htmlFor="featured" className="text-sm font-black text-slate-700">منتج مميز</Label>
                                        <p className="text-[10px] text-slate-400 font-medium">يظهر في قسم الترشيحات والصفحة الرئيسية</p>
                                      </div>
                                      <Switch id="featured" checked={formData.isFeatured} onCheckedChange={(c) => setFormData({ ...formData, isFeatured: c })} />
                                    </div>
                                    <Separator className="bg-slate-50" />
                                    <div className="flex items-center justify-between group">
                                      <div className="space-y-0.5">
                                        <Label htmlFor="outOfStock" className="text-sm font-black text-rose-600">نفذت الكمية</Label>
                                        <p className="text-[10px] text-slate-400 font-medium">يظهر المنتج ولكن غير متاح للطلب</p>
                                      </div>
                                      <Switch id="outOfStock" checked={formData.isOutOfStock} onCheckedChange={(c) => setFormData({ ...formData, isOutOfStock: c })} className="data-[state=checked]:bg-rose-500" />
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Right Column: Information */}
                              <div className="lg:col-span-7 space-y-8">
                                <section className="space-y-6">
                                  <div className="space-y-3">
                                    <Label className="text-lg font-black text-slate-800">المعلومات الأساسية</Label>
                                    <Input
                                      value={formData.name}
                                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                                      placeholder="مثلاً: هبرة حاشي بلدي طازج"
                                      className="h-14 rounded-2xl border-slate-200 bg-white font-black text-xl shadow-sm focus:ring-primary"
                                    />
                                  </div>

                                  <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                      <Label className="font-bold text-slate-600 mr-1">السعر (ر.س)</Label>
                                      <div className="relative">
                                        <Input
                                          type="number"
                                          value={formData.price}
                                          onChange={e => setFormData({ ...formData, price: e.target.value })}
                                          placeholder="0.00"
                                          className="h-14 rounded-2xl border-slate-200 bg-white pr-4 pl-12 font-black text-2xl text-primary shadow-sm"
                                        />
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">﷼</span>
                                      </div>
                                    </div>
                                    <div className="space-y-3">
                                      <Label className="font-bold text-slate-600 mr-1">التصنيف</Label>
                                      <Select value={formData.categoryId} onValueChange={(v) => setFormData({ ...formData, categoryId: v })}>
                                        <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-white font-black shadow-sm">
                                          <SelectValue placeholder="اختر التصنيف" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                                          {categories.map(c => (
                                            <SelectItem key={c.id} value={c.id} className="font-bold py-3">{c.icon} {c.name}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                      <Label className="font-bold text-slate-600 mr-1">وحدة البيع</Label>
                                      <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                                        <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-white font-bold shadow-sm">
                                          <SelectValue placeholder="اختر الوحدة" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                                          <SelectItem value="ذبيحة" className="font-bold">ذبيحة</SelectItem>
                                          <SelectItem value="نصف" className="font-bold">نصف ذبيحة</SelectItem>
                                          <SelectItem value="كيلو" className="font-bold">كيلو</SelectItem>
                                          <SelectItem value="طبق" className="font-bold">طبق</SelectItem>
                                          <SelectItem value="other" className="font-bold">وحدة أخرى...</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      {formData.unit === "other" && (
                                        <Input
                                          placeholder="اسم الوحدة..."
                                          value={formData.customUnit}
                                          onChange={e => setFormData({ ...formData, customUnit: e.target.value })}
                                          className="mt-2 h-12 rounded-xl border-slate-200 shadow-sm"
                                        />
                                      )}
                                    </div>
                                    <div className="space-y-3">
                                      <Label className="font-bold text-slate-600 mr-1">الوسام الترويجي</Label>
                                      <Input
                                        value={formData.badge}
                                        onChange={e => setFormData({ ...formData, badge: e.target.value })}
                                        placeholder="مثال: ذبح اليوم 🔪"
                                        className="h-14 rounded-2xl border-slate-200 bg-white font-bold shadow-sm"
                                      />
                                    </div>
                                  </div>

                                  <div className="space-y-3">
                                    <Label className="font-bold text-slate-600 mr-1">المخزون المتاح (اختياري)</Label>
                                    <div className="relative">
                                      <Input
                                        type="number"
                                        value={formData.stockQuantity}
                                        onChange={e => setFormData({ ...formData, stockQuantity: e.target.value })}
                                        placeholder="اتركه فارغاً إذا كان غير محدود"
                                        className="h-14 rounded-2xl border-slate-200 bg-white pr-12 font-black shadow-sm"
                                      />
                                      <Package className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
                                    </div>
                                  </div>
                                </section>

                                <section className="p-8 bg-slate-900 rounded-[2.5rem] text-white space-y-6 shadow-xl">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/20 rounded-xl">
                                      <PlusCircle className="text-primary w-5 h-5" />
                                    </div>
                                    <h4 className="text-lg font-black tracking-tight">خيارات التجهيز للعملاء</h4>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${formData.hasCutting ? 'bg-primary/10 border-primary' : 'bg-white/5 border-white/10 hover:border-white/20'}`} onClick={() => setFormData({ ...formData, hasCutting: !formData.hasCutting })}>
                                      <div className="flex justify-between items-start mb-3">
                                        <Scissors className={formData.hasCutting ? 'text-primary' : 'text-slate-500'} />
                                        <Switch checked={formData.hasCutting} onCheckedChange={(c) => setFormData({ ...formData, hasCutting: c })} />
                                      </div>
                                      <p className="font-black text-sm">تجهيز وتقطيع</p>
                                    </div>
                                    <div className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${formData.hasPackaging ? 'bg-orange-500/10 border-orange-500' : 'bg-white/5 border-white/10 hover:border-white/20'}`} onClick={() => setFormData({ ...formData, hasPackaging: !formData.hasPackaging })}>
                                      <div className="flex justify-between items-start mb-3">
                                        <Box className={formData.hasPackaging ? 'text-orange-500' : 'text-slate-500'} />
                                        <Switch checked={formData.hasPackaging} onCheckedChange={(c) => setFormData({ ...formData, hasPackaging: c })} className="data-[state=checked]:bg-orange-500" />
                                      </div>
                                      <p className="font-black text-sm">تغليف خاص</p>
                                    </div>
                                    <div className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${formData.hasExtras ? 'bg-purple-500/10 border-purple-500' : 'bg-white/5 border-white/10 hover:border-white/20'}`} onClick={() => setFormData({ ...formData, hasExtras: !formData.hasExtras })}>
                                      <div className="flex justify-between items-start mb-3">
                                        <UtensilsCrossed className={formData.hasExtras ? 'text-purple-500' : 'text-slate-500'} />
                                        <Switch checked={formData.hasExtras} onCheckedChange={(c) => setFormData({ ...formData, hasExtras: c })} className="data-[state=checked]:bg-purple-500" />
                                      </div>
                                      <p className="font-black text-sm">إضافات جانبية</p>
                                    </div>
                                  </div>
                                </section>
                              </div>
                            </div>

                            <div className="mt-10 mb-10 space-y-4">
                              <Label className="text-lg font-black text-slate-800 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-primary" /> وصف المنتج التفصيلي
                              </Label>
                              <Textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="اكتب وصفاً جذاباً يشرح جودة المنتج ومصدره..."
                                className="min-h-[160px] rounded-[2rem] border-slate-200 bg-white p-6 font-medium text-lg shadow-sm resize-none focus:ring-primary"
                              />
                            </div>
                          </div>
                        </ScrollArea>
                      </div>

                      <DialogFooter className="p-8 border-t bg-white flex flex-col md:flex-row gap-4 shrink-0">
                        <Button
                          className="flex-1 h-14 rounded-2xl bg-slate-900 text-white text-xl font-black shadow-2xl shadow-slate-200 hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all gap-3"
                          onClick={() => saveProductMutation.mutate()}
                          disabled={saveProductMutation.isPending || isUploading}
                        >
                          {saveProductMutation.isPending ? <Loader2 className="animate-spin" /> : <><Check className="w-6 h-6" /> {editingProduct ? "حفظ كافة التغييرات" : "إضافة المنتج للمتجر"}</>}
                        </Button>
                        <Button
                          variant="outline"
                          className="h-14 px-10 rounded-2xl border-slate-200 text-slate-500 font-bold hover:bg-slate-50"
                          onClick={() => setIsProductDialogOpen(false)}
                        >
                          إلغاء
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pb-10 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-3 px-6 py-3 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-200 font-black cursor-pointer hover:scale-105 transition-all">
                  <LayoutGrid className="w-5 h-5" /> الكل
                </div>
                {categories.map((cat: any) => (
                  <div key={cat.id} className="flex items-center gap-3 px-6 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-sm hover:shadow-md transition-all cursor-pointer group hover:border-primary">
                    <span className="text-xl group-hover:scale-125 transition-transform">{cat.icon}</span>
                    <span className="font-black text-slate-700">{cat.name}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
                {products.map((product) => (
                  <Card key={product.id} className={`group relative overflow-hidden border-none shadow-2xl shadow-slate-200/50 rounded-[3rem] bg-white hover:-translate-y-3 transition-all duration-700 ${!product.isActive ? 'opacity-70 grayscale' : ''}`}>
                    <div className="relative h-72 overflow-hidden">
                      <img
                        src={product.image || '/assets/product-placeholder.jpg'}
                        className={`w-full h-full object-cover transform scale-105 group-hover:scale-110 transition-transform duration-1000 ${product.imageObjectPosition || 'object-center'}`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                      {/* Action Overlays */}
                      <div className="absolute inset-0 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-all duration-500 scale-90 group-hover:scale-100">
                        <Button size="icon" className="w-14 h-14 rounded-3xl bg-white text-slate-900 hover:bg-slate-100 shadow-2xl" onClick={() => handleEditClick(product)}>
                          <Edit className="w-6 h-6" />
                        </Button>
                        <Button size="icon" variant="destructive" className="w-14 h-14 rounded-3xl shadow-2xl" onClick={() => {
                          if (confirm("هل أنت متأكد من حذف هذا المنتج؟")) deleteProductMutation.mutate(product.id)
                        }}>
                          <Trash2 className="w-6 h-6" />
                        </Button>
                      </div>

                      {/* Status Badges */}
                      <div className="absolute top-6 right-6 flex flex-col gap-2">
                        {product.badge && (
                          <Badge className="bg-amber-400 text-amber-950 border-none font-black px-4 py-1.5 rounded-xl shadow-lg animate-pulse">{product.badge}</Badge>
                        )}
                        {product.isFeatured && (
                          <Badge className="bg-indigo-600 text-white border-none font-black px-4 py-1.5 rounded-xl shadow-lg">⭐ مميز</Badge>
                        )}
                      </div>

                      {!product.isActive && (
                        <div className="absolute top-6 left-6 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20">
                          <span className="text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><EyeOff className="w-3 h-3" /> مخفي عن العملاء</span>
                        </div>
                      )}

                      <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-[1.5rem] shadow-2xl">
                          <p className="text-[10px] font-black text-indigo-300 uppercase mb-0.5">السعر</p>
                          <p className="text-2xl font-black text-white">{product.price} <span className="text-xs font-bold text-white/70">﷼</span></p>
                        </div>
                      </div>
                    </div>

                    <CardContent className="p-8 space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h3 className="text-2xl font-black text-slate-900 mb-1 leading-tight group-hover:text-primary transition-colors">{product.name}</h3>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-slate-200" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{categories.find(c => c.id === product.categoryId)?.name || 'غير مصنف'}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="h-10 px-4 rounded-xl border-slate-100 bg-slate-50 font-black text-slate-500 whitespace-nowrap">{product.unit || 'حبة'}</Badge>
                      </div>

                      <p className="text-slate-500 font-medium text-sm leading-relaxed line-clamp-2 h-10">{product.description || 'لا يوجد وصف متوفر لهذا المنتج المتميز.'}</p>

                      <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${((product.stockQuantity || 0) || 0) > 5 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          {((product.stockQuantity || 0) || 0) > 5 ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                          <span className="text-[10px] font-black uppercase">المخزون: {((product.stockQuantity || 0) || 0) || 0}</span>
                        </div>
                        <div className="flex -space-x-2">
                          <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-black">SA</div>
                          <div className="w-8 h-8 rounded-full border-2 border-white bg-indigo-50 flex items-center justify-center text-[10px] font-black text-indigo-600">ME</div>
                          <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-900 flex items-center justify-center text-[8px] font-black text-white">+20</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === "orders" && (
            <div className="space-y-6 animate-in fade-in-50">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-extrabold font-heading text-slate-900 flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl text-primary">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                    سجل الطلبات
                  </h1>
                  <p className="text-muted-foreground mt-2">متابعة وتحديث حالات طلبات العملاء وتعيين السائقين</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="h-12 px-6 rounded-2xl border-primary/20 text-primary font-bold bg-primary/5 text-lg">
                    {orders.length} طلب إجمالي
                  </Badge>
                </div>
              </div>

              <div className="grid gap-6">
                {orders.map((order: any) => (
                  <Card key={order.id} className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 overflow-hidden group bg-white/80 backdrop-blur-sm rounded-[2rem]">
                    <div className="flex flex-col md:flex-row">
                      <div className={`w-2 md:w-4 ${order.status === 'completed' ? 'bg-emerald-500' :
                        order.status === 'preparing' ? 'bg-amber-400' :
                          order.status === 'shipping' ? 'bg-blue-500' :
                            order.status === 'cancelled' ? 'bg-rose-500' : 'bg-indigo-400'}`} />
                      <div className="flex-1 p-8">
                        <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-6 mb-8">
                          <div className="flex flex-wrap items-center gap-6">
                            <div className="bg-slate-100/80 p-4 rounded-[1.5rem] shadow-inner">
                              <Package className="w-8 h-8 text-slate-700" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">طلب #{order.id}</h3>
                                <Badge variant="outline" className="bg-slate-50 text-[10px] uppercase font-bold tracking-widest px-2 py-0 border-slate-200">
                                  {order.paymentMethod === 'cash' ? 'كاش' : 'دفع إلكتروني'}
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-500 font-medium flex items-center gap-2 bg-slate-50 w-fit px-3 py-1 rounded-full border border-slate-100">
                                <Clock className="w-4 h-4 text-primary" /> {new Date(order.createdAt || order.created_at || Date.now()).toLocaleString('ar-SA')}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-4">
                            <div className="text-left xl:text-right px-6 py-3 bg-slate-50 rounded-2xl border border-slate-100/50">
                              <p className="text-sm font-bold text-slate-400 mb-1">المجموع النهائي</p>
                              <p className="text-3xl font-black text-primary">{order.total} <span className="text-sm font-bold">﷼</span></p>
                            </div>
                            <div className="flex gap-2">
                              <Button size="icon" variant="ghost" className="h-12 w-12 rounded-2xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all" onClick={() => { setInvoiceOrder(order); setIsInvoiceChoiceOpen(true); }}>
                                <Printer className="w-6 h-6" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-12 w-12 rounded-2xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all" onClick={async () => {
                                if (confirm("هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع عن هذه الخطوة.")) {
                                  await supabase.from('orders').delete().eq('id', order.id);
                                  queryClient.invalidateQueries({ queryKey: ["orders"] });
                                  toast({ title: "تم حذف الطلب" });
                                }
                              }}><Trash2 className="w-6 h-6" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
                          <div className="p-5 bg-blue-50/30 rounded-3xl border border-blue-100/20 group-hover:bg-blue-50/50 transition-colors">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
                                <Users className="w-4 h-4" />
                              </div>
                              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">بيانات العميل</span>
                            </div>
                            <p className="font-black text-slate-900 text-lg mb-1">{order.customerName || order.customer_name || 'عميل مسجل'}</p>
                            <p className="text-sm font-bold text-slate-600 flex items-center gap-2">
                              <Phone className="w-3 h-4 text-emerald-500" /> {order.customerPhone || order.customer_phone}
                            </p>
                          </div>

                          <div className="p-5 bg-indigo-50/30 rounded-3xl border border-indigo-100/20 group-hover:bg-indigo-50/50 transition-colors">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
                                <MapPin className="w-4 h-4" />
                              </div>
                              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">موقع التوصيل</span>
                            </div>
                            <p className="text-sm font-bold text-slate-700 leading-snug line-clamp-2">{order.address}</p>
                          </div>

                          <div className="p-5 bg-emerald-50/30 rounded-3xl border border-emerald-100/20 group-hover:bg-emerald-50/50 transition-colors">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
                                <Truck className="w-4 h-4" />
                              </div>
                              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">السائق (موظف)</span>
                            </div>
                            <Select
                              value={order.driver_staff_id?.toString() || order.driverStaffId?.toString() || "null"}
                              onValueChange={(v) => updateOrderAssignmentsMutation.mutate({ id: order.id, driverStaffId: v === "null" ? null : parseInt(v) })}
                            >
                              <SelectTrigger className="h-10 rounded-xl bg-white border-emerald-100 shadow-sm text-sm font-bold">
                                <SelectValue placeholder="اختر سائقاً..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="null">غير محدد</SelectItem>
                                {staffList.filter(s => s.role === 'delivery').map(s => (
                                  <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="p-5 bg-rose-50/30 rounded-3xl border border-rose-100/20 group-hover:bg-rose-50/50 transition-colors">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="p-2 bg-rose-100 rounded-xl text-rose-600">
                                <UserCheck className="w-4 h-4" />
                              </div>
                              <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">الجزار المسئول</span>
                            </div>
                            <Select
                              value={order.butcher_staff_id?.toString() || order.butcherStaffId?.toString() || "null"}
                              onValueChange={(v) => updateOrderAssignmentsMutation.mutate({ id: order.id, butcherStaffId: v === "null" ? null : parseInt(v) })}
                            >
                              <SelectTrigger className="h-10 rounded-xl bg-white border-rose-100 shadow-sm text-sm font-bold">
                                <SelectValue placeholder="اختر جزاراً..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="null">غير محدد</SelectItem>
                                {staffList.filter(s => s.role === 'butcher').map(s => (
                                  <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 group-hover:bg-slate-100/50 transition-colors">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="p-2 bg-slate-200 rounded-xl text-slate-600">
                                <BarChart3 className="w-4 h-4" />
                              </div>
                              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">حالة الطلب</span>
                            </div>
                            <Select onValueChange={(v) => updateOrderStatusMutation.mutate({
                              id: order.id,
                              status: v,
                              userId: order.user_id || order.userId,
                              orderNumber: order.id
                            })} value={order.status}>
                              <SelectTrigger className={`h-11 rounded-xl font-black text-sm border-none shadow-md ${order.status === 'completed' ? 'bg-emerald-500 text-white' :
                                order.status === 'preparing' ? 'bg-amber-400 text-slate-900' :
                                  order.status === 'shipping' ? 'bg-blue-500 text-white' :
                                    order.status === 'cancelled' ? 'bg-rose-500 text-white' : 'bg-indigo-500 text-white'
                                }`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-2xl border-none shadow-2xl">
                                <SelectItem value="pending" className="font-bold py-3"><div className="flex items-center gap-2">🔄 قيد الانتظار</div></SelectItem>
                                <SelectItem value="preparing" className="font-bold py-3"><div className="flex items-center gap-2">👨‍🍳 جاري التجهيز</div></SelectItem>
                                <SelectItem value="shipping" className="font-bold py-3"><div className="flex items-center gap-2">🚚 يتم التوصيل الآن</div></SelectItem>
                                <SelectItem value="completed" className="font-bold py-3"><div className="flex items-center gap-2">✅ تم التسليم بنجاح</div></SelectItem>
                                <SelectItem value="cancelled" className="font-bold py-3"><div className="flex items-center gap-2">❌ إلغاء الطلب</div></SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-100">
                          <div className="flex flex-wrap items-center gap-4">
                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 px-4 py-1.5 rounded-full font-bold border-none">
                              {order.order_items?.length || 0} صنف فريد
                            </Badge>
                            {order.notes && (
                              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-1.5 rounded-full text-xs font-bold border border-amber-100">
                                <MessageSquare className="w-4 h-4" /> العميل لديه ملاحظات
                              </div>
                            )}
                          </div>

                          <Button
                            variant="default"
                            className="rounded-2xl h-12 px-8 font-black shadow-lg shadow-primary/20 hover:scale-105 transition-all text-base gap-2"
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsDetailsDialogOpen(true);
                            }}
                          >
                            مشاهدة التفاصيل الكاملة <ChevronDown className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}

                {/* Empty State */}
                {orders.length === 0 && (
                  <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 shadow-sm">
                    <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                      <ShoppingBag className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">لا يوجد طلبات حالياً</h3>
                    <p className="text-slate-400 font-medium">ستظهر الطلبات الجديدة هنا فور تلقيها من المتجر</p>
                  </div>
                )}

                {/* Empty state and dialog moved to global container for cross-tab accessibility */}
              </div>
            </div>
          )}

          {activeTab === "categories" && (
            <div className="space-y-6 animate-in fade-in-50">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold font-heading text-slate-900">إدارة التصنيفات</h1>
                  <p className="text-muted-foreground font-medium">تنظيم المنتجات في تصنيفات جذابة وسهلة الوصول</p>
                </div>
                <Button onClick={() => {
                  setNewCategory({ id: "", name: "", icon: "", image: "" });
                  setIsEditingCategory(false);
                  setImageFile(null);
                  setIsCategoryDialogOpen(true);
                }} className="gap-2 rounded-2xl bg-slate-900 h-11 px-6 shadow-lg shadow-slate-200 hover:scale-[1.02] transition-all">
                  <Plus className="w-4 h-4" /> تصنيف جديد
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {categories.map((cat: any) => {
                  const productCount = products.filter(p => p.categoryId === cat.id).length;
                  return (
                    <Card key={cat.id} className="relative group overflow-hidden border-none shadow-xl shadow-slate-200/40 rounded-[2.5rem] bg-white hover:scale-[1.02] transition-all duration-500">
                      <div className="h-48 relative overflow-hidden">
                        <img src={cat.image || '/assets/category-placeholder.jpg'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
                        <div className="absolute top-6 right-6 bg-white/20 backdrop-blur-md border border-white/20 px-4 py-2 rounded-2xl flex items-center gap-2 text-white shadow-xl">
                          <span className="text-3xl drop-shadow-lg">{cat.icon}</span>
                        </div>
                        <div className="absolute bottom-6 right-6">
                          <h3 className="text-2xl font-black text-white drop-shadow-lg">{cat.name}</h3>
                          <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest">{productCount} منتج نشط</p>
                        </div>
                      </div>

                      <CardContent className="p-6 bg-white">
                        <div className="flex justify-between items-center">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">معرف التصنيف</span>
                            <code className="text-xs font-mono font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">{cat.id}</code>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="secondary" size="icon" className="h-10 w-10 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl" onClick={() => {
                              setNewCategory({ id: cat.id, name: cat.name, icon: cat.icon, image: cat.image || "" });
                              setIsEditingCategory(true);
                              setImageFile(null);
                              setIsCategoryDialogOpen(true);
                            }}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="secondary" size="icon" className="h-10 w-10 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl" onClick={async () => {
                              if (confirm("هل أنت متأكد؟ سيتم حذف جميع منتجات القسم!")) {
                                const { error } = await supabase.from('categories').delete().eq('id', cat.id);
                                if (!error) queryClient.invalidateQueries({ queryKey: ["categories"] });
                              }
                            }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Category Management Dialog */}
              <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogContent dir="rtl" className="max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white relative overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-10 translate-x-10" />
                    <DialogTitle className="text-2xl font-black flex items-center gap-3 relative z-10">
                      <FolderTree className="text-primary w-8 h-8" /> {isEditingCategory ? "تعديل التصنيف" : "تصنيف جديد"}
                    </DialogTitle>
                    <DialogDescription className="text-slate-400 mt-2 font-medium relative z-10">قم بتنظيم منتجاتك في تصنيفات جذابة</DialogDescription>
                  </div>

                  <ScrollArea className="max-h-[70vh]">
                    <div className="p-8 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="font-bold text-slate-700">معرف (ID)</Label>
                          <Input
                            placeholder="lamb"
                            value={newCategory.id}
                            onChange={e => setNewCategory({ ...newCategory, id: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                            className="h-12 rounded-xl border-slate-200 focus:ring-primary shadow-sm"
                            disabled={isEditingCategory}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-bold text-slate-700">أيقونة (Emoji)</Label>
                          <Input
                            placeholder="📦"
                            value={newCategory.icon}
                            onChange={e => setNewCategory({ ...newCategory, icon: e.target.value })}
                            className="h-12 rounded-xl text-center text-2xl border-slate-200 shadow-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="font-bold text-slate-700">اسم التصنيف</Label>
                        <Input
                          placeholder="مثلاً: لحوم أغنام برية"
                          value={newCategory.name}
                          onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                          className="h-14 rounded-2xl font-black text-lg border-slate-200 shadow-sm"
                        />
                      </div>

                      <div className="space-y-4">
                        <Label className="font-bold text-slate-700">صورة التصنيف</Label>
                        <div className="border-2 border-dashed rounded-[2rem] p-4 text-center hover:bg-slate-50 transition-all cursor-pointer relative group min-h-[180px] flex flex-col justify-center items-center overflow-hidden border-slate-200">
                          <Input
                            type="file"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-[20]"
                            onChange={(e) => {
                              if (e.target.files?.[0]) setImageFile(e.target.files[0]);
                            }}
                            accept="image/*"
                          />
                          {imageFile || newCategory.image ? (
                            <div className="relative w-full h-40 rounded-2xl overflow-hidden group/img shadow-md">
                              <img src={imageFile ? URL.createObjectURL(imageFile) : newCategory.image} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                <ImageIcon className="text-white w-8 h-8" />
                                <p className="text-white text-xs font-bold">تغيير الصورة المختارة</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-3 py-6">
                              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                <ImageIcon size={32} />
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-black text-slate-600">اضغط لرفع صورة</p>
                                <p className="text-[10px] text-slate-400 font-medium">PNG, JPG up to 5MB</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>

                  <DialogFooter className="p-8 bg-slate-50 border-t flex flex-col sm:flex-row gap-3 shrink-0">
                    <Button
                      onClick={() => addCategoryMutation.mutate()}
                      className="w-full h-14 rounded-2xl bg-slate-900 text-white text-lg font-black shadow-xl shadow-slate-200 hover:scale-[1.02] transition-all active:scale-[0.98]"
                      disabled={addCategoryMutation.isPending || isUploading || !newCategory.id || !newCategory.name}
                    >
                      {addCategoryMutation.isPending ? <Loader2 className="animate-spin" /> : <><Check className="w-5 h-5 ml-2" /> حفظ التصنيف</>}
                    </Button>
                  </DialogFooter>
                </DialogContent>

              </Dialog>
            </div>
          )}

          {activeTab === "attributes" && (
            <div className="space-y-8 animate-in fade-in-50 duration-500">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
                <div>
                  <h1 className="text-4xl font-black font-heading text-slate-900 tracking-tight">إدارة الإضافات</h1>
                  <p className="text-muted-foreground mt-2 font-medium">تحكم في خيارات التقطيع، التغليف، والإضافات الجانبية لكل منتج</p>
                </div>
                <div className="flex gap-3">
                  <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-bold text-slate-600">النظام نشط وجاهز</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Cutting Types Card */}
                <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(37,99,235,0.1)] transition-all duration-500 overflow-hidden rounded-[2.5rem] bg-white group">
                  <CardHeader className="bg-gradient-to-br from-blue-50 to-white border-b border-blue-100/50 p-8">
                    <CardTitle className="text-xl font-black flex items-center gap-3 text-blue-900">
                      <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                        <Scissors className="w-6 h-6" />
                      </div>
                      أنواع التقطيع
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-8">
                    <div className="space-y-3 min-h-[200px]">
                      {attributes.filter(a => a.type === 'cutting').map(t => (
                        <div key={t.id} className="flex justify-between items-center p-4 bg-slate-50/50 border border-slate-100 rounded-2xl hover:border-blue-300 hover:bg-white hover:shadow-md transition-all group/item">
                          <span className="font-bold text-slate-700">{t.name}</span>
                          <div className="flex items-center gap-3">
                            <Switch checked={t.isActive !== false} onCheckedChange={async (checked) => {
                              await supabase.from('product_attributes').update({ is_active: checked }).eq('id', t.id);
                              queryClient.invalidateQueries({ queryKey: ["product_attributes"] });
                            }} className="data-[state=checked]:bg-blue-600" />
                            <Button size="icon" variant="ghost" className="h-9 w-9 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl opacity-0 group-hover/item:opacity-100 transition-all" onClick={async () => {
                              if (confirm("هل أنت متأكد من حذف هذا الخيار؟")) {
                                await supabase.from('product_attributes').delete().eq('id', t.id);
                                queryClient.invalidateQueries({ queryKey: ["product_attributes"] });
                              }
                            }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-6 pt-6 border-t border-slate-100">
                      <Input id="new-cutting" placeholder="إضافة نوع تقطيع..." className="h-12 rounded-xl border-slate-200 focus:ring-blue-500 focus:border-blue-500 font-bold" />
                      <Button className="h-12 w-12 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 shrink-0" onClick={async () => {
                        const name = (document.getElementById('new-cutting') as HTMLInputElement).value;
                        if (!name) return;
                        await supabase.from('product_attributes').insert([{ name, type: 'cutting', is_active: true }]);
                        (document.getElementById('new-cutting') as HTMLInputElement).value = "";
                        queryClient.invalidateQueries({ queryKey: ["product_attributes"] });
                        toast({ title: "تم إضافة خيار التقطيع بنجاح" });
                      }}>
                        <Plus className="w-5 h-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Packaging Types Card */}
                <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(249,115,22,0.1)] transition-all duration-500 overflow-hidden rounded-[2.5rem] bg-white group">
                  <CardHeader className="bg-gradient-to-br from-orange-50 to-white border-b border-orange-100/50 p-8">
                    <CardTitle className="text-xl font-black flex items-center gap-3 text-orange-900">
                      <div className="p-3 bg-orange-500 rounded-2xl text-white shadow-lg shadow-orange-200 group-hover:scale-110 transition-transform">
                        <Box className="w-6 h-6" />
                      </div>
                      أنواع التغليف
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-8">
                    <div className="space-y-3 min-h-[200px]">
                      {attributes.filter(a => a.type === 'packaging').map(t => (
                        <div key={t.id} className="flex justify-between items-center p-4 bg-slate-50/50 border border-slate-100 rounded-2xl hover:border-orange-300 hover:bg-white hover:shadow-md transition-all group/item">
                          <span className="font-bold text-slate-700">{t.name}</span>
                          <div className="flex items-center gap-3">
                            <Switch checked={t.isActive !== false} onCheckedChange={async (checked) => {
                              await supabase.from('product_attributes').update({ is_active: checked }).eq('id', t.id);
                              queryClient.invalidateQueries({ queryKey: ["product_attributes"] });
                            }} className="data-[state=checked]:bg-orange-500" />
                            <Button size="icon" variant="ghost" className="h-9 w-9 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl opacity-0 group-hover/item:opacity-100 transition-all" onClick={async () => {
                              if (confirm("هل أنت متأكد من حذف هذا الخيار؟")) {
                                await supabase.from('product_attributes').delete().eq('id', t.id);
                                queryClient.invalidateQueries({ queryKey: ["product_attributes"] });
                              }
                            }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-6 pt-6 border-t border-slate-100">
                      <Input id="new-packaging" placeholder="إضافة نوع تغليف..." className="h-12 rounded-xl border-slate-200 focus:ring-orange-500 focus:border-orange-500 font-bold" />
                      <Button className="h-12 w-12 rounded-xl bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-200 shrink-0" onClick={async () => {
                        const name = (document.getElementById('new-packaging') as HTMLInputElement).value;
                        if (!name) return;
                        await supabase.from('product_attributes').insert([{ name, type: 'packaging', is_active: true }]);
                        (document.getElementById('new-packaging') as HTMLInputElement).value = "";
                        queryClient.invalidateQueries({ queryKey: ["product_attributes"] });
                        toast({ title: "تم إضافة خيار التغليف بنجاح" });
                      }}>
                        <Plus className="w-5 h-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Extras Card */}
                <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(168,85,247,0.1)] transition-all duration-500 overflow-hidden rounded-[2.5rem] bg-white group">
                  <CardHeader className="bg-gradient-to-br from-purple-50 to-white border-b border-purple-100/50 p-8">
                    <CardTitle className="text-xl font-black flex items-center gap-3 text-purple-900">
                      <div className="p-3 bg-purple-600 rounded-2xl text-white shadow-lg shadow-purple-200 group-hover:scale-110 transition-transform">
                        <UtensilsCrossed className="w-6 h-6" />
                      </div>
                      الإضافات الجانبية
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-8">
                    <div className="space-y-3 min-h-[200px]">
                      {attributes.filter(a => a.type === 'extra').map(t => (
                        <div key={t.id} className="flex justify-between items-center p-4 bg-slate-50/50 border border-slate-100 rounded-2xl hover:border-purple-300 hover:bg-white hover:shadow-md transition-all group/item">
                          <span className="font-bold text-slate-700">{t.name}</span>
                          <div className="flex items-center gap-3">
                            <Switch checked={t.isActive !== false} onCheckedChange={async (checked) => {
                              await supabase.from('product_attributes').update({ is_active: checked }).eq('id', t.id);
                              queryClient.invalidateQueries({ queryKey: ["product_attributes"] });
                            }} className="data-[state=checked]:bg-purple-600" />
                            <Button size="icon" variant="ghost" className="h-9 w-9 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl opacity-0 group-hover/item:opacity-100 transition-all" onClick={async () => {
                              if (confirm("هل أنت متأكد من حذف هذا الخيار؟")) {
                                await supabase.from('product_attributes').delete().eq('id', t.id);
                                queryClient.invalidateQueries({ queryKey: ["product_attributes"] });
                              }
                            }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-6 pt-6 border-t border-slate-100">
                      <Input id="new-extra" placeholder="إضافة خيار إضافي..." className="h-12 rounded-xl border-slate-200 focus:ring-purple-500 focus:border-purple-500 font-bold" />
                      <Button className="h-12 w-12 rounded-xl bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-200 shrink-0" onClick={async () => {
                        const name = (document.getElementById('new-extra') as HTMLInputElement).value;
                        if (!name) return;
                        await supabase.from('product_attributes').insert([{ name, type: 'extra', is_active: true }]);
                        (document.getElementById('new-extra') as HTMLInputElement).value = "";
                        queryClient.invalidateQueries({ queryKey: ["product_attributes"] });
                        toast({ title: "تم إضافة الخيار الإضافي بنجاح" });
                      }}>
                        <Plus className="w-5 h-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Info Banner */}
              <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-1000" />
                <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="flex-1 space-y-4">
                    <Badge className="bg-primary/20 text-primary border-none font-bold px-4 py-1">نظام الإضافات الذكي ✨</Badge>
                    <h2 className="text-3xl font-black">كيف يعمل نظام الإضافات؟</h2>
                    <p className="text-slate-400 text-lg leading-relaxed max-w-2xl font-medium">
                      يمكنك تفعيل خيارات التجهيز (تقطيع، تغليف، إضافات) لكل منتج على حدة من صفحة المنتجات. الخيارات المفعلة هنا ستظهر تلقائياً للعميل عند اختيار المنتج الذي يدعم هذه الخاصية.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                    <div className="p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm text-center">
                      <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">إجمالي الخيارات</p>
                      <p className="text-xl font-black text-white">{attributes.length}</p>
                    </div>
                    <div className="p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm text-center">
                      <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">التغطية</p>
                      <p className="text-xl font-black text-emerald-400">نشطة</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "delivery" && (
            <div className="space-y-6 animate-in fade-in-50">
              <div className="flex border-b border-gray-100 pb-4 justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold font-heading text-slate-900">مناطق التوصيل</h1>
                  <p className="text-muted-foreground text-sm">إدارة النطاق الجغرافي ورسوم الخدمة لكل منطقة</p>
                </div>
                <Dialog open={isZoneDialogOpen} onOpenChange={(val) => {
                  setIsZoneDialogOpen(val);
                  if (!val) {
                    setEditingZone(null);
                    setZoneForm({ name: "", fee: "0", minOrder: "0", coordinates: "" });
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button className="gap-2 rounded-2xl bg-slate-900 hover:bg-slate-800 h-11 px-6 shadow-lg shadow-slate-200">
                      <Plus className="w-4 h-4" /> إضافة منطقة جديدة
                    </Button>
                  </DialogTrigger>
                  <DialogContent dir="rtl" className="max-w-5xl max-h-[90vh] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl flex flex-col">
                    <div className="flex flex-col flex-1 min-h-0">
                      <DialogHeader className="p-8 border-b bg-white/50 backdrop-blur-md shrink-0">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-slate-900 rounded-2xl text-white">
                            <Truck className="w-6 h-6" />
                          </div>
                          <div>
                            <DialogTitle className="text-2xl font-black text-slate-900">
                              {editingZone ? "تعديل نطاق التوصيل" : "إضافة منطقة تغطية جديدة"}
                            </DialogTitle>
                            <DialogDescription className="text-sm font-medium text-slate-500">
                              حدد الرسوم والحدود الجغرافية بدقة لضمان دقة النظام
                            </DialogDescription>
                          </div>
                        </div>
                      </DialogHeader>

                      <div className="flex-1 overflow-hidden bg-slate-50/30">
                        <div className="grid grid-cols-1 lg:grid-cols-12 h-full min-h-0 overflow-y-auto lg:overflow-hidden custom-scrollbar">
                          {/* Map Side */}
                          <div className="lg:col-span-7 bg-slate-100 border-l border-slate-100 relative min-h-[450px] lg:h-full">
                            <div className="absolute inset-0">
                              <ZoneMap
                                initialCoordinates={(() => {
                                  if (!zoneForm.coordinates) return undefined;
                                  try {
                                    const parsed = typeof zoneForm.coordinates === 'string' ? JSON.parse(zoneForm.coordinates) : zoneForm.coordinates;
                                    return Array.isArray(parsed) ? parsed : undefined;
                                  } catch (e) {
                                    console.error("Error parsing zone coordinates:", e);
                                    return undefined;
                                  }
                                })()}
                                onChange={(coords) => setZoneForm({ ...zoneForm, coordinates: coords ? JSON.stringify(coords) : "" })}
                                existingZones={deliveryZones}
                                editingZoneId={editingZone?.id}
                              />
                            </div>
                          </div>

                          {/* Form Side */}
                          <div className="lg:col-span-5 flex flex-col bg-white lg:h-full">
                            <ScrollArea className="flex-1 lg:h-full max-h-[calc(90vh-200px)]">
                              <div className="p-6 lg:p-8 space-y-8 pb-32">
                                <section className="space-y-4">
                                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-8 h-[1px] bg-slate-200"></span> بيانات المنطقة
                                  </h4>
                                  <div className="space-y-2">
                                    <Label className="font-bold text-slate-700 mr-1">اسم المنطقة التنظيمي</Label>
                                    <Input placeholder="مثال: حي النرجس / شمال الرياض" value={zoneForm.name} onChange={e => setZoneForm({ ...zoneForm, name: e.target.value })} className="h-14 rounded-2xl border-slate-200 focus:ring-slate-900 font-bold text-lg" />
                                  </div>
                                </section>

                                <section className="space-y-4">
                                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-8 h-[1px] bg-slate-200"></span> الضوابط والرسوم
                                  </h4>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label className="font-bold text-slate-700 mr-1">رسوم التوصيل (﷼)</Label>
                                      <div className="relative">
                                        <Input type="number" value={zoneForm.fee} onChange={e => setZoneForm({ ...zoneForm, fee: e.target.value })} className="h-14 rounded-2xl border-slate-200 pr-4 pl-12 font-black text-xl text-primary" />
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">﷼</span>
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="font-bold text-slate-700 mr-1">عمولة السائق (%)</Label>
                                      <div className="relative">
                                        <Input type="number" value={zoneForm.driverCommission} onChange={e => setZoneForm({ ...zoneForm, driverCommission: e.target.value })} className="h-14 rounded-2xl border-indigo-200 pr-4 pl-12 font-black text-xl text-indigo-700" />
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400 font-bold text-xs">%</span>
                                      </div>
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                      <Label className="font-bold text-slate-700 mr-1">الحد الأدنى للطلب (﷼)</Label>
                                      <div className="relative">
                                        <Input type="number" value={zoneForm.minOrder} onChange={e => setZoneForm({ ...zoneForm, minOrder: e.target.value })} className="h-14 rounded-2xl border-slate-200 pr-4 pl-12 font-black text-xl text-slate-700" />
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">﷼</span>
                                      </div>
                                    </div>
                                  </div>
                                </section>

                                <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 space-y-3">
                                  <div className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-wider">
                                    <Navigation className="w-3.5 h-3.5" /> تعليمات سريعة
                                  </div>
                                  <ul className="text-[11px] text-slate-500 space-y-1.5 font-bold list-none">
                                    <li className="flex items-start gap-2">
                                      <div className="w-1 h-1 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                                      للأشكال الهندسية: انقر مرة للمركز ومرة للتوسعة
                                    </li>
                                    <li className="flex items-start gap-2">
                                      <div className="w-1 h-1 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                                      للمضلع: استمر بالنقر لتحديد كل زاوية
                                    </li>
                                  </ul>
                                </div>
                              </div>
                            </ScrollArea>
                          </div>
                        </div>
                      </div>

                      {/* Fixed Footer with Button */}
                      <div className="p-5 lg:p-6 bg-white border-t border-slate-100 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                        <Button
                          onClick={() => saveZoneMutation.mutate()}
                          className="w-full h-14 rounded-2xl bg-slate-900 text-white text-lg font-black shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all hover:scale-[1.01] active:scale-[0.98] gap-3"
                          disabled={saveZoneMutation.isPending}
                        >
                          {saveZoneMutation.isPending ? <Loader2 className="animate-spin" /> : <><Check className="w-5 h-5" /> {editingZone ? "حفظ التعديلات" : "إضافة المنطقة الآن"}</>}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 border-none shadow-xl shadow-slate-200/50 overflow-hidden rounded-[2rem] bg-white">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-none">
                        <TableHead className="text-right py-5 pr-8">المنطقة</TableHead>
                        <TableHead className="text-right">رسوم العميل</TableHead>
                        <TableHead className="text-right">عمولة السائق</TableHead>
                        <TableHead className="text-right">الحد الأدنى</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-center pl-8">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveryZones.map(zone => (
                        <TableRow key={zone.id} className="group hover:bg-slate-50/30 transition-colors border-slate-50">
                          <TableCell className="font-black text-slate-800 pr-8">{zone.name}</TableCell>
                          <TableCell className="font-bold text-primary">{zone.fee} ﷼</TableCell>
                          <TableCell className="font-bold text-indigo-600">{(zone as any).driver_commission || (zone as any).driverCommission || 0}%</TableCell>
                          <TableCell className="font-medium text-slate-600 font-mono">{zone.minOrder} ﷼</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={zone.isActive !== false}
                                onCheckedChange={async (val) => {
                                  await supabase.from('delivery_zones').update({ is_active: val }).eq('id', zone.id);
                                  queryClient.invalidateQueries({ queryKey: ["delivery_zones"] });
                                  toast({ title: val ? "تم تفعيل المنطقة" : "تم تعطيل المنطقة" });
                                }}
                              />
                              <span className={`text-[10px] font-bold ${zone.isActive !== false ? "text-emerald-500" : "text-slate-400"}`}>
                                {zone.isActive !== false ? "نشط" : "معطل"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="pl-8">
                            <div className="flex gap-1 justify-center opacity-20 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl" onClick={() => handleEditZone(zone)}><Edit className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl" onClick={async () => {
                                if (confirm("هل أنت متأكد من حذف هذه المنطقة؟ سيؤثر هذا على الطلبات الحالية.")) {
                                  const { error } = await supabase.from('delivery_zones').delete().eq('id', zone.id);
                                  if (error) toast({ title: "خطأ في الحذف", description: error.message, variant: "destructive" });
                                  else queryClient.invalidateQueries({ queryKey: ["delivery_zones"] });
                                }
                              }}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {deliveryZones.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-20 text-slate-400 italic">لا توجد مناطق توصيل مضافة حالياً.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Card>

                <Card className="border-none shadow-2xl shadow-slate-900/40 bg-slate-950 overflow-hidden rounded-[2.5rem] relative min-h-[500px] group border-4 border-white/5">
                  <div className="absolute inset-0">
                    <ZonesPreviewMap zones={deliveryZones} />
                  </div>
                  {/* Subtle Interactive Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent pointer-events-none" />
                </Card>
              </div>
            </div>
          )
          }

          {
            activeTab === "customers" && (
              <div className="space-y-8 animate-in fade-in-50 duration-500 pb-20">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
                  <div>
                    <h1 className="text-4xl font-black font-heading text-slate-900 tracking-tight">إدارة المجتمع</h1>
                    <p className="text-slate-500 font-medium">تحليل سلوك العملاء والتواصل المباشر مع القاعدة الجماهيرية</p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => setIsBroadcastDialogOpen(true)}
                      className="gap-2 bg-slate-900 hover:bg-slate-800 text-white h-12 px-6 rounded-2xl shadow-xl shadow-slate-200 transition-all hover:scale-[1.02]"
                    >
                      <Bell className="w-5 h-5 text-indigo-400" /> بث رسالة جماعية
                    </Button>
                    <div className="relative w-full md:w-64">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input placeholder="ابحث عن عميل..." className="pr-10 h-12 rounded-2xl border-slate-200 bg-white" />
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {[
                    { label: "إجمالي العملاء", val: usersList.length, color: "bg-indigo-600", icon: Users },
                    { label: "كبار الشخصيات VIP", val: usersList.filter(u => (orders.filter(o => o.userId === u.id).length > 5)).length, color: "bg-amber-500", icon: Gift },
                    { label: "نشط اليوم", val: Math.floor(usersList.length * 0.4), color: "bg-emerald-500", icon: TrendingUp },
                    { label: "محظورين", val: usersList.filter(u => u.isBanned).length, color: "bg-red-500", icon: Ban },
                  ].map((stat, i) => (
                    <Card key={i} className="border-none shadow-xl shadow-slate-100/50 rounded-[2rem] overflow-hidden group">
                      <div className="p-6 flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                          <p className="text-3xl font-black text-slate-900">{stat.val}</p>
                        </div>
                        <div className={`p-4 ${stat.color} text-white rounded-2xl shadow-lg group-hover:rotate-12 transition-transform`}>
                          <stat.icon className="w-6 h-6" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <Card className="border-none shadow-2xl shadow-slate-200/40 overflow-hidden rounded-[2.5rem] bg-white">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-none">
                        <TableHead className="text-right py-6 pr-8">العميل والتقييم</TableHead>
                        <TableHead className="text-right">التواصل والنشاط</TableHead>
                        <TableHead className="text-right">المحفظة والإنفاق</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-center pl-8">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersList.map((customer: any) => {
                        const customerOrders = orders.filter(o => o.userId === customer.id);
                        const totalSpend = customerOrders.reduce((acc, o) => acc + (parseFloat(o.total as any) || 0), 0);
                        const isVIP = customerOrders.length > 5;
                        const isGold = customerOrders.length > 3 && customerOrders.length <= 5;

                        return (
                          <TableRow key={customer.id} className="group hover:bg-slate-50/50 transition-all border-slate-50">
                            <TableCell className="py-5 pr-8">
                              <div className="flex items-center gap-4">
                                <div className="relative">
                                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center font-black text-xl text-slate-600 shadow-inner">
                                    {customer.username?.[0]?.toUpperCase()}
                                  </div>
                                  {isVIP && (
                                    <div className="absolute -top-2 -right-2 bg-amber-400 text-white p-1 rounded-lg shadow-lg border-2 border-white">
                                      <Gift className="w-3 h-3" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-black text-slate-900 text-lg flex items-center gap-2">
                                    {customer.username}
                                    {isVIP ? (
                                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none px-2 rounded-lg text-[10px] uppercase font-black">VIP</Badge>
                                    ) : isGold ? (
                                      <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none px-2 rounded-lg text-[10px] uppercase font-black">GOLD</Badge>
                                    ) : null}
                                  </span>
                                  <span className="text-[11px] text-slate-400 font-bold">{customer.id.substring(0, 8)}...</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <span className="font-black text-slate-700 flex items-center gap-2" dir="ltr">
                                  <Phone className="w-3.5 h-3.5 text-slate-300" /> {customer.phone || '—'}
                                </span>
                                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-2">
                                  <Clock className="w-3.5 h-3.5" /> مسجل منذ {new Date(customer.createdAt || customer.created_at || Date.now()).toLocaleDateString('ar-SA')}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-xl font-black text-primary drop-shadow-sm">{totalSpend.toFixed(0)} ﷼</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">إجمالي المشتريات ({customerOrders.length} طلبات)</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={customer.is_banned ? 'destructive' : 'outline'} className={`rounded-xl px-3 py-1 font-black text-[10px] border-none ${!customer.is_banned && 'bg-emerald-50 text-emerald-600'}`}>
                                {customer.is_banned ? 'محظور نهائياً' : 'عميل نشط'}
                              </Badge>
                            </TableCell>
                            <TableCell className="pl-8 text-center">
                              <div className="flex justify-center gap-2">
                                <Button
                                  variant="secondary"
                                  size="icon"
                                  className="rounded-xl h-10 w-10 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:scale-110 transition-all border-none"
                                  onClick={() => setMessageDialog({ open: true, user: customer })}
                                >
                                  <MessageSquare className="w-5 h-5" />
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="icon"
                                  className={`rounded-xl h-10 w-10 transition-all hover:rotate-12 ${customer.is_banned ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-red-50 text-red-500 hover:bg-red-100"}`}
                                  onClick={() => banUserMutation.mutate({ id: customer.id, isBanned: !customer.is_banned })}
                                >
                                  {customer.is_banned ? <Unlock className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Card>

                {/* Broadcast Dialog */}
                <Dialog open={isBroadcastDialogOpen} onOpenChange={setIsBroadcastDialogOpen}>
                  <DialogContent dir="rtl" className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="p-8 border-b bg-slate-900 text-white">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 rounded-2xl">
                          <Bell className="w-7 h-7 text-indigo-400 animate-bounce" />
                        </div>
                        <div>
                          <DialogTitle className="text-2xl font-black">مركز البث الموحد</DialogTitle>
                          <DialogDescription className="text-slate-400 font-medium">إرسال تنبيهات ذكية لمجموعات محددة من المستخدمين</DialogDescription>
                        </div>
                      </div>
                    </DialogHeader>
                    <div className="p-8 space-y-6 bg-slate-50">
                      <div className="space-y-3">
                        <Label className="font-black text-slate-900 text-lg">الجهة المستهدفة</Label>
                        <div className="grid grid-cols-3 gap-4">
                          {[
                            { id: 'all', label: 'الجميع', icon: Users, desc: 'كل المستخدمين' },
                            { id: 'admins', label: 'الإدارة', icon: Settings, desc: 'المدراء فقط' },
                            { id: 'workers', label: 'العاملين', icon: Truck, desc: 'فريق العمل' },
                          ].map((t) => (
                            <div
                              key={t.id}
                              onClick={() => setBroadcastTarget(t.id as any)}
                              className={`p-4 rounded-3xl cursor-pointer transition-all border-2 flex flex-col items-center text-center gap-2 ${broadcastTarget === t.id ? 'bg-white border-indigo-600 shadow-xl shadow-indigo-100 scale-105' : 'bg-white/50 border-white hover:border-slate-200'}`}
                            >
                              <t.icon className={`w-6 h-6 ${broadcastTarget === t.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                              <span className={`font-black tracking-tighter ${broadcastTarget === t.id ? 'text-slate-900' : 'text-slate-500'}`}>{t.label}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase">{t.desc}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="font-black text-slate-900">عنوان التنبيه</Label>
                          <Input
                            value={broadcastTitle}
                            onChange={e => setBroadcastTitle(e.target.value)}
                            placeholder="مثال: خصم خاص للعملاء المميزين!"
                            className="h-14 rounded-2xl border-white shadow-inner font-bold text-lg focus:ring-slate-900"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-black text-slate-900">محتوى الرسالة</Label>
                          <Textarea
                            value={broadcastMessage}
                            onChange={e => setBroadcastMessage(e.target.value)}
                            placeholder="اكتب تفاصيل الرسالة هنا..."
                            className="h-40 rounded-3xl border-white shadow-inner font-medium resize-none focus:ring-slate-900 p-6"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="p-8 bg-white border-t flex gap-4">
                      <Button variant="outline" onClick={() => setIsBroadcastDialogOpen(false)} className="flex-1 h-14 rounded-2xl font-black text-slate-600">إلغاء</Button>
                      <Button
                        onClick={() => sendBroadcastMutation.mutate()}
                        disabled={sendBroadcastMutation.isPending || !broadcastTitle || !broadcastMessage}
                        className="flex-[2] h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-black shadow-xl shadow-indigo-100 gap-3"
                      >
                        {sendBroadcastMutation.isPending ? <Loader2 className="animate-spin" /> : <><Check className="w-6 h-6" /> إطلاق البث الآن</>}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Individual Message Dialog */}
                <Dialog open={messageDialog.open} onOpenChange={(o) => setMessageDialog({ ...messageDialog, open: o })}>
                  <DialogContent dir="rtl" className="rounded-[2rem]">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-black text-slate-900 flex items-center gap-2">
                        <MessageSquare className="text-indigo-600" /> مراسلة {messageDialog.user?.username}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="py-6 space-y-5">
                      <div className="space-y-2">
                        <Label className="font-bold mr-1">نص الرسالة</Label>
                        <Textarea
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          placeholder="اكتب رسالتك الخاصة للعميل هنا..."
                          className="h-40 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white transition-all text-lg font-medium p-4"
                        />
                      </div>
                      <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                        <p className="text-xs text-amber-800 leading-relaxed font-bold">سيتم إرسال هذه الرسالة كإشعار داخلي يظهر للعميل في قائمة التنبيهات فوراً.</p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={() => {
                          sendMessageMutation.mutate({ userId: messageDialog.user!.id, title: "رسالة خاصة من الإدارة", message: messageText });
                        }}
                        className="w-full h-14 rounded-2xl bg-slate-900 text-white text-lg font-black"
                        disabled={!messageText || sendMessageMutation.isPending}
                      >
                        {sendMessageMutation.isPending ? <Loader2 className="animate-spin" /> : "إرسال الرسالة"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )
          }

          {
            activeTab === "staff" && (
              <div className="space-y-8 animate-in fade-in-50 duration-500 pb-20">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
                  <div>
                    <h1 className="text-4xl font-black font-heading text-slate-900 tracking-tight">إدارة الموظفين</h1>
                    <p className="text-slate-500 font-medium">إدارة طاقم العمل، الجزارين، المحاسبين وسائقي التوصيل</p>
                  </div>
                  <Button
                    onClick={() => {
                      setEditingStaff(null);
                      setStaffForm({ name: "", phone: "", role: "butcher", username: "", password: "", email: "", userId: "", permissions: [] });
                      setCreationMode("new");
                      setUserSearchTerm("");
                      setIsStaffDialogOpen(true);
                    }}
                    className="gap-2 bg-slate-900 hover:bg-slate-800 text-white h-12 px-6 rounded-2xl shadow-xl shadow-slate-200 transition-all hover:scale-[1.02]"
                  >
                    <Plus className="w-5 h-5 text-indigo-400" /> إضافة موظف جديد
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {[
                    { label: "إجمالي الموظفين", val: staffList.length, color: "bg-indigo-600", icon: Users },
                    { label: "الجزارين", val: staffList.filter(s => s.role === 'butcher').length, color: "bg-rose-500", icon: Scissors },
                    { label: "التوصيل", val: staffList.filter(s => s.role === 'delivery').length, color: "bg-blue-500", icon: Truck },
                    { label: "المحاسبين والمديرين", val: staffList.filter(s => ['accountant', 'manager'].includes(s.role)).length, color: "bg-emerald-500", icon: DollarSign },
                    { label: "فريق الدعم والتصميم", val: staffList.filter(s => ['support', 'designer'].includes(s.role)).length, color: "bg-purple-500", icon: PenTool },
                  ].map((stat, i) => (
                    <Card key={i} className="border-none shadow-xl shadow-slate-100/50 rounded-[2rem] overflow-hidden group">
                      <div className="p-6 flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                          <p className="text-3xl font-black text-slate-900">{stat.val}</p>
                        </div>
                        <div className={`p-4 ${stat.color} text-white rounded-2xl shadow-lg group-hover:rotate-12 transition-transform`}>
                          <stat.icon className="w-6 h-6" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <Card className="border-none shadow-2xl shadow-slate-200/40 overflow-hidden rounded-[2.5rem] bg-white">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-none">
                        <TableHead className="text-right py-6 pr-8">الموظف</TableHead>
                        <TableHead className="text-right">الوظيفة / الدور</TableHead>
                        <TableHead className="text-right">رقم التواصل</TableHead>
                        <TableHead className="text-right">تاريخ الانضمام</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-center pl-8">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staffList.map((member: any) => (
                        <TableRow key={member.id} className="group hover:bg-slate-50/50 transition-all border-slate-50">
                          <TableCell className="py-5 pr-8">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-600">
                                {member.name?.[0]}
                              </div>
                              <span className="font-black text-slate-900 text-lg">{member.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`rounded-lg px-3 py-1 font-bold border-none
                              ${member.role === 'butcher' ? 'bg-rose-50 text-rose-600' :
                                member.role === 'manager' ? 'bg-indigo-50 text-indigo-600' :
                                  member.role === 'delivery' ? 'bg-blue-50 text-blue-600' :
                                    member.role === 'accountant' ? 'bg-emerald-50 text-emerald-600' :
                                      member.role === 'support' ? 'bg-teal-50 text-teal-600' :
                                        member.role === 'designer' ? 'bg-purple-50 text-purple-600' :
                                          'bg-slate-50 text-slate-600'}`}>
                              {member.role === 'butcher' ? 'جزار' :
                                member.role === 'manager' ? 'مدير عمليات' :
                                  member.role === 'delivery' ? 'توصيل' :
                                    member.role === 'accountant' ? 'محاسب' :
                                      member.role === 'support' ? 'خدمة عملاء' :
                                        member.role === 'designer' ? 'مصمم' : member.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-bold text-slate-600" dir="ltr">{member.phone}</TableCell>
                          <TableCell className="text-slate-400 text-sm font-medium">
                            {new Date(member.joinedAt || member.joined_at || Date.now()).toLocaleDateString('ar-SA')}
                          </TableCell>
                          <TableCell>
                            <Badge variant={member.isActive ? 'outline' : 'destructive'} className={`rounded-xl px-3 py-1 font-black text-[10px] border-none ${member.isActive && 'bg-emerald-50 text-emerald-600'}`}>
                              {member.isActive ? 'على رأس العمل' : 'متوقف'}
                            </Badge>
                          </TableCell>
                          <TableCell className="pl-8 text-center">
                            <div className="flex justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-xl h-10 w-10 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                                onClick={() => {
                                  setSelectedStaffDetails(member);
                                  setIsStaffDetailsOpen(true);
                                }}
                              >
                                <BarChart3 className="w-5 h-5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-xl h-10 w-10 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                onClick={() => {
                                  setEditingStaff(member);
                                  setStaffForm({
                                    name: member.name,
                                    phone: member.phone,
                                    role: member.role,
                                    permissions: member.permissions || [],
                                    username: member.username || "",
                                    email: member.email || "",
                                    userId: member.userId || "",
                                    password: ""
                                  });
                                  setCreationMode("new"); // Edit mode is effectively 'new' style but with fixed username
                                  setIsStaffDialogOpen(true);
                                }}
                              >
                                <Edit className="w-5 h-5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-xl h-10 w-10 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  if (confirm("هل أنت متأكد من حذف بيانات هذا الموظف؟")) deleteStaffMutation.mutate(member.id);
                                }}
                              >
                                <Trash2 className="w-5 h-5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {staffList.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-20 text-slate-400 italic">
                            لا يوجد موظفين مسجلين حالياً. ابدأ بإضافة طاقم عملك.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Card>

                {/* Staff Dialog */}
                <Dialog open={isStaffDialogOpen} onOpenChange={setIsStaffDialogOpen}>
                  <DialogContent dir="rtl" className="max-w-xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="p-8 border-b bg-slate-900 text-white">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 rounded-2xl">
                          <UserCheck className="w-7 h-7 text-indigo-400" />
                        </div>
                        <div className="flex-1">
                          <DialogTitle className="text-2xl font-black">{editingStaff ? "تعديل بيانات موظف" : "إضافة موظف جديد"}</DialogTitle>
                          <DialogDescription className="text-slate-400 font-medium">أضف بيانات الموظف والصلاحيات الوظيفية</DialogDescription>
                        </div>
                        {!editingStaff && (
                          <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button
                              onClick={() => setCreationMode("new")}
                              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${creationMode === "new" ? "bg-white shadow-sm text-indigo-600" : "text-slate-500"}`}
                            >
                              حساب جديد
                            </button>
                            <button
                              onClick={() => setCreationMode("existing")}
                              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${creationMode === "existing" ? "bg-white shadow-sm text-indigo-600" : "text-slate-500"}`}
                            >
                              مستخدم موجود
                            </button>
                          </div>
                        )}
                      </div>
                    </DialogHeader>

                    <ScrollArea className="max-h-[70vh]">
                      <div className="p-8 space-y-6 bg-slate-50">
                        {creationMode === "existing" && !editingStaff && !staffForm.userId ? (
                          <div className="space-y-4">
                            <div className="flex flex-col gap-4">
                              <Label className="font-black text-slate-900">البحث عن مستخدم (بالاسم أو الرقم)</Label>
                              <div className="relative">
                                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <Input
                                  placeholder="اكتب اسم المستخدم للبحث..."
                                  className="h-12 pr-12 rounded-xl bg-white border-slate-200"
                                  value={userSearchTerm}
                                  onChange={(e) => setUserSearchTerm(e.target.value)}
                                />
                              </div>
                            </div>
                            <Label className="font-black text-slate-900">اختر من جميع مستخدمي الموقع</Label>
                            <div className="grid gap-3">
                              {isUsersLoading ? (
                                <div className="p-8 text-center text-slate-400 font-bold bg-white rounded-2xl border-2 border-dashed">
                                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                                  جاري جلب قائمة المستخدمين...
                                </div>
                              ) : (
                                <>
                                  <ScrollArea className="h-[400px] -mx-2 px-2">
                                    <div className="space-y-3">
                                      {recentUsers?.filter((u: any) =>
                                        u.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                                        (u.phone && u.phone.includes(userSearchTerm))
                                      ).map((user: any) => (
                                        <div
                                          key={user.id}
                                          onClick={() => {
                                            setStaffForm({
                                              ...staffForm,
                                              name: user.username,
                                              email: user.email || "",
                                              phone: user.phone || "",
                                              username: user.username,
                                              userId: user.id
                                            });
                                          }}
                                          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 ${staffForm.userId === user.id ? 'border-indigo-500 bg-indigo-50' : 'border-white bg-white hover:border-slate-200 hover:shadow-md'}`}
                                        >
                                          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200 shadow-sm">
                                            {user.username.charAt(0).toUpperCase()}
                                          </div>
                                          <div className="flex-1">
                                            <div className="font-bold text-slate-900">{user.username}</div>
                                            <div className="text-xs text-slate-500 font-medium">{user.email || 'بدون بريد'} | {user.phone || 'بدون رقم'}</div>
                                          </div>
                                          <div className="p-2 rounded-full bg-slate-50 text-indigo-600">
                                            <PlusCircle className="w-5 h-5" />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </ScrollArea>
                                  {(!recentUsers || recentUsers.length === 0) && (
                                    <div className="p-12 text-center text-slate-400 font-bold bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
                                      لم يتم العثور على أي مستخدمين مسجلين حالياً
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-8">
                            {creationMode === "existing" && staffForm.userId && (
                              <div className="bg-indigo-600 p-6 rounded-[2rem] text-white flex items-center gap-6 shadow-xl shadow-indigo-200 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                                <div className="w-16 h-16 rounded-[1.5rem] bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl font-black border border-white/20">
                                  {staffForm.username?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                  <p className="text-indigo-100 text-xs font-black uppercase tracking-widest mb-1">المستخدم المختار</p>
                                  <h3 className="text-xl font-black">{staffForm.username}</h3>
                                  <p className="text-indigo-200/80 text-sm font-bold">{staffForm.email || 'لا يوجد بريد'}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  className="bg-white/10 hover:bg-white/20 text-white border-white/10 rounded-xl"
                                  onClick={() => setStaffForm({ ...staffForm, userId: "" })}
                                >
                                  تغيير المستخدم
                                </Button>
                              </div>
                            )}

                            <div className="space-y-6">
                              <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <Label className="font-black text-slate-900 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                    الاسم الكامل للموظف <span className="text-red-500">*</span>
                                  </Label>
                                  <Input
                                    value={staffForm.name}
                                    onChange={e => setStaffForm({ ...staffForm, name: e.target.value })}
                                    placeholder="مثال: أحمد محمد علي"
                                    className="h-14 rounded-2xl border-white bg-white shadow-sm hover:shadow-md transition-shadow font-bold text-lg"
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="font-black text-slate-900 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                    رقم الجوال <span className="text-red-500">*</span>
                                  </Label>
                                  <Input
                                    value={staffForm.phone}
                                    onChange={e => setStaffForm({ ...staffForm, phone: e.target.value })}
                                    placeholder="05xxxxxxx"
                                    className="h-14 rounded-2xl border-white bg-white shadow-sm hover:shadow-md transition-shadow font-bold text-lg"
                                    dir="ltr"
                                    required
                                  />
                                </div>
                              </div>

                              {creationMode === "new" && (
                                <div className="space-y-6 p-8 bg-indigo-50/50 rounded-[2.5rem] border border-indigo-100/50">
                                  <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                      <Lock className="w-4 h-4" />
                                    </div>
                                    <h3 className="font-black text-slate-900">بيانات الدخول (الحساب الجديد)</h3>
                                  </div>
                                  <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                      <Label className="font-black text-slate-700">اسم المستخدم <span className="text-red-500">*</span></Label>
                                      <Input
                                        value={staffForm.username}
                                        onChange={e => setStaffForm({ ...staffForm, username: e.target.value })}
                                        placeholder="Staff_2024"
                                        className="h-12 rounded-xl border-white shadow-sm"
                                        disabled={!!editingStaff}
                                        required={!editingStaff}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="font-black text-slate-700">البريد الإلكتروني <span className="text-red-500">*</span></Label>
                                      <Input
                                        type="email"
                                        value={staffForm.email}
                                        onChange={e => setStaffForm({ ...staffForm, email: e.target.value })}
                                        placeholder="name@company.com"
                                        className="h-12 rounded-xl border-white shadow-sm"
                                        required={!editingStaff}
                                      />
                                    </div>
                                    {!editingStaff && (
                                      <div className="space-y-2 col-span-full">
                                        <Label className="font-black text-slate-700">كلمة المرور المؤقتة <span className="text-red-500">*</span></Label>
                                        <Input
                                          type="password"
                                          value={staffForm.password}
                                          onChange={e => setStaffForm({ ...staffForm, password: e.target.value })}
                                          placeholder="********"
                                          className="h-12 rounded-xl border-white shadow-sm"
                                          required
                                          minLength={6}
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              <div className="space-y-2">
                                <Label className="font-black text-slate-900 flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                  الدور الوظيفي الرئيسي
                                </Label>
                                <Select value={staffForm.role} onValueChange={v => setStaffForm({ ...staffForm, role: v })}>
                                  <SelectTrigger className="h-14 rounded-2xl border-white bg-white shadow-sm hover:shadow-md transition-shadow font-bold text-lg">
                                    <SelectValue placeholder="اختر الدور الوظيفي" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-2xl border-none shadow-2xl p-2">
                                    <SelectItem value="manager" className="font-bold py-3 hover:bg-slate-50 rounded-xl cursor-pointer">📊 مدير طلبات / مشرف</SelectItem>
                                    <SelectItem value="butcher" className="font-bold py-3 hover:bg-slate-50 rounded-xl cursor-pointer">🔪 جزار / فني تجهيز</SelectItem>
                                    <SelectItem value="delivery" className="font-bold py-3 hover:bg-slate-50 rounded-xl cursor-pointer">🚚 سائق توصيل</SelectItem>
                                    <SelectItem value="accountant" className="font-bold py-3 hover:bg-slate-50 rounded-xl cursor-pointer">💰 محاسب / مدخل بيانات</SelectItem>
                                    <SelectItem value="support" className="font-bold py-3 hover:bg-slate-50 rounded-xl cursor-pointer">🎧 خدمة عملاء</SelectItem>
                                    <SelectItem value="designer" className="font-bold py-3 hover:bg-slate-50 rounded-xl cursor-pointer">🎨 مصمم / سوشيال ميديا</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-4">
                                <Label className="font-black text-slate-900 text-lg flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                  صلاحيات الوصول المخصصة
                                </Label>
                                <div className="grid grid-cols-2 gap-3">
                                  {availablePermissions.map(perm => {
                                    const isSelected = staffForm.permissions?.includes(perm.id);
                                    return (
                                      <div
                                        key={perm.id}
                                        onClick={() => {
                                          const current = staffForm.permissions || [];
                                          if (current.includes(perm.id)) {
                                            setStaffForm({ ...staffForm, permissions: current.filter(id => id !== perm.id) });
                                          } else {
                                            setStaffForm({ ...staffForm, permissions: [...current, perm.id] });
                                          }
                                        }}
                                        className={`flex items-center gap-3 p-5 rounded-[1.5rem] border-2 cursor-pointer transition-all duration-300 ${isSelected
                                          ? 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200 scale-[1.02]'
                                          : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200 hover:shadow-md'
                                          }`}
                                      >
                                        <div className={`p-2 rounded-xl ${isSelected ? 'bg-white/10' : 'bg-slate-50'}`}>
                                          <perm.icon className={`h-5 w-5 ${isSelected ? 'text-white' : 'text-indigo-500'}`} />
                                        </div>
                                        <span className="font-black text-sm tracking-tight">{perm.label}</span>
                                        {isSelected && (
                                          <div className="mr-auto w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                                            <Check className="h-3 w-3 text-white" />
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                      </div>
                    </ScrollArea>
                    <div className="p-8 bg-white border-t flex gap-4">
                      <Button variant="outline" onClick={() => setIsStaffDialogOpen(false)} className="flex-1 h-14 rounded-2xl font-black text-slate-600">إلغاء</Button>
                      <Button
                        onClick={() => saveStaffMutation.mutate()}
                        disabled={
                          saveStaffMutation.isPending ||
                          !staffForm.name ||
                          !staffForm.phone ||
                          (creationMode === "new" && !editingStaff && (!staffForm.username || !staffForm.email || !staffForm.password)) ||
                          (creationMode === "existing" && !editingStaff && !staffForm.userId)
                        }
                        className="flex-[2] h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-black shadow-xl shadow-indigo-100 gap-3"
                      >
                        {saveStaffMutation.isPending ? <Loader2 className="animate-spin" /> : <><Check className="w-6 h-6" /> {editingStaff ? "حفظ التغييرات" : "إضافة الموظف الآن"}</>}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Staff Details & Performance Dialog */}
                <Dialog open={isStaffDetailsOpen} onOpenChange={setIsStaffDetailsOpen}>
                  <DialogContent dir="rtl" className="max-w-3xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
                    {selectedStaffDetails && (
                      <div className="flex flex-col h-[85vh]">
                        <div className="p-8 bg-slate-900 text-white relative">
                          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                          <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-6">
                              <div className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center text-3xl font-black border border-white/10">
                                {selectedStaffDetails.name?.[0]}
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                  <h2 className="text-3xl font-black">{selectedStaffDetails.name}</h2>
                                  <Badge className="bg-indigo-500 text-white border-none font-bold">
                                    {selectedStaffDetails.role === 'butcher' ? 'جزار' :
                                      selectedStaffDetails.role === 'delivery' ? 'سائق' :
                                        selectedStaffDetails.role === 'manager' ? 'مدير' : selectedStaffDetails.role}
                                  </Badge>
                                </div>
                                <p className="text-indigo-200 font-medium">عضو منذ {new Date(selectedStaffDetails.joinedAt || Date.now()).toLocaleDateString('ar-SA')}</p>
                              </div>
                            </div>
                            <Button variant="ghost" onClick={() => setIsStaffDetailsOpen(false)} className="text-white/60 hover:text-white hover:bg-white/10 rounded-full">
                              <X className="w-6 h-6" />
                            </Button>
                          </div>
                        </div>

                        <ScrollArea className="flex-1 bg-slate-50">
                          <div className="p-8 space-y-8">
                            {/* Role Specific Performance Header */}
                            {selectedStaffDetails.role === 'delivery' && (
                              <div className="grid grid-cols-3 gap-6">
                                <Card className="p-6 border-none shadow-sm rounded-3xl bg-white space-y-2">
                                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">إجمالي الطلبات</p>
                                  <p className="text-3xl font-black text-slate-900">
                                    {orders.filter(o => o.driverStaffId === selectedStaffDetails.id).length}
                                  </p>
                                </Card>
                                <Card className="p-6 border-none shadow-sm rounded-3xl bg-white space-y-2">
                                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">تم توصيلها</p>
                                  <p className="text-3xl font-black text-emerald-600">
                                    {orders.filter(o => o.driverStaffId === selectedStaffDetails.id && o.status === 'completed').length}
                                  </p>
                                </Card>
                                <Card className="p-6 border-none shadow-sm rounded-3xl bg-white space-y-2">
                                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">عمولات مقدرة</p>
                                  <p className="text-3xl font-black text-indigo-600">
                                    {orders.filter(o => o.driverStaffId === selectedStaffDetails.id && o.status === 'completed').reduce((acc, o) => {
                                      const zone = deliveryZones.find(z => z.id === o.zoneId);
                                      const commission = (zone as any)?.driver_commission || (zone as any)?.driverCommission || 15;
                                      return acc + ((o.total * (commission / 100)) || 0);
                                    }, 0).toFixed(0)} ﷼
                                  </p>
                                </Card>
                              </div>
                            )}

                            {selectedStaffDetails.role === 'butcher' && (
                              <div className="grid grid-cols-2 gap-6">
                                <Card className="p-6 border-none shadow-sm rounded-3xl bg-white space-y-2">
                                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">تحديثات المخزون</p>
                                  <p className="text-3xl font-black text-slate-900">
                                    {butcherInventoryLogs.filter(l => l.staffId === selectedStaffDetails.id).length}
                                  </p>
                                </Card>
                                <Card className="p-6 border-none shadow-sm rounded-3xl bg-white space-y-2">
                                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">آخر نشاط</p>
                                  <p className="text-xl font-black text-indigo-600">
                                    {(() => {
                                      const logs = butcherInventoryLogs.filter(l => l.staffId === selectedStaffDetails.id);
                                      return logs[0] ? new Date(logs[0].createdAt || Date.now()).toLocaleDateString('ar-SA') : 'لا يوجد';
                                    })()}
                                  </p>
                                </Card>
                              </div>
                            )}

                            {/* Detailed Activity Log */}
                            <div className="space-y-4">
                              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-indigo-500" />
                                سجل النشاط التفصيلي
                              </h3>

                              <div className="space-y-4">
                                {selectedStaffDetails.role === 'butcher' && (
                                  butcherInventoryLogs.filter(l => l.staffId === selectedStaffDetails.id).length > 0 ? (
                                    butcherInventoryLogs.filter(l => l.staffId === selectedStaffDetails.id).map((log, idx) => {
                                      const product = products.find(p => p.id === log.productId);
                                      return (
                                        <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-100 flex items-center justify-between group hover:border-indigo-200 transition-colors">
                                          <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-50">
                                              {log.actionType === 'update' ? <TrendingUp className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                                            </div>
                                            <div className="space-y-0.5">
                                              <p className="font-black text-slate-900">تحديث: {product?.name || 'منتج غير معروف'}</p>
                                              <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
                                                <span>{new Date(log.createdAt || Date.now()).toLocaleString('ar-SA')}</span>
                                                <Badge variant="outline" className="text-[10px] py-0">{log.actionType || 'update'}</Badge>
                                              </div>
                                            </div>
                                          </div>
                                          <div className="text-left space-y-1">
                                            {log.newQuantity !== log.oldQuantity && (
                                              <p className="text-sm font-bold text-slate-600">
                                                الكمية: <span className="text-slate-400 line-through">{log.oldQuantity}</span> ← <span className="text-indigo-600">{log.newQuantity}</span>
                                              </p>
                                            )}
                                            {log.newPrice !== log.oldPrice && (
                                              <p className="text-sm font-bold text-slate-600">
                                                السعر: <span className="text-slate-400 line-through">{log.oldPrice}</span> ← <span className="text-emerald-600">{log.newPrice} ﷼</span>
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-100 text-slate-400 font-bold">
                                      لا توجد سجلات تحديث مخزون لهذا الجزار حتى الآن.
                                    </div>
                                  )
                                )}

                                {selectedStaffDetails.role === 'delivery' && (
                                  orders.filter(o => o.driverStaffId === selectedStaffDetails.id).length > 0 ? (
                                    orders.filter(o => o.driverStaffId === selectedStaffDetails.id).map((order, idx) => (
                                      <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-100 flex items-center justify-between hover:border-blue-200 transition-colors">
                                        <div className="flex items-center gap-4">
                                          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                                            <Package className="w-6 h-6" />
                                          </div>
                                          <div className="space-y-0.5">
                                            <p className="font-black text-slate-900">طلب رقم #{order.id}</p>
                                            <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
                                              <span>{new Date(order.createdAt || Date.now()).toLocaleString('ar-SA')}</span>
                                              <Badge className={order.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-none' : 'bg-amber-50 text-amber-600 border-none'}>
                                                {order.status === 'completed' ? 'تم التوصيل' : 'قيد العمل'}
                                              </Badge>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="text-left">
                                          <p className="text-lg font-black text-slate-900">{order.total} ﷼</p>
                                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">إجمالي الفاتورة</p>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-100 text-slate-400 font-bold">
                                      لم يقم هذا السائق بتوصيل أي طلبات بعد.
                                    </div>
                                  )
                                )}

                                {selectedStaffDetails.role !== 'butcher' && selectedStaffDetails.role !== 'delivery' && (
                                  <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-100 text-slate-400 font-bold">
                                    هذا الدور الوظيفي لا يحتوي على سجلات أداء مباشرة حالياً.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </ScrollArea>

                        <div className="p-6 bg-white border-t flex justify-end">
                          <Button onClick={() => setIsStaffDetailsOpen(false)} className="h-12 px-8 rounded-2xl bg-slate-900 text-white font-black hover:bg-slate-800 transition-colors">إغلاق النافذة</Button>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            )
          }

          {
            activeTab === "marketing" && (
              <div className="space-y-10 animate-in fade-in-50 duration-700 pb-20">
                {/* Header Section with Glassmorphism and Depth */}
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-8 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-10 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/20 transition-all duration-1000" />
                  <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />

                  <div className="space-y-4 relative z-10 max-w-2xl">
                    <div className="flex items-center gap-4">
                      <div className="p-4 bg-white/10 backdrop-blur-2xl rounded-[2rem] border border-white/10 shadow-inner">
                        <Megaphone className="w-10 h-10 text-indigo-400 animate-bounce-slow" />
                      </div>
                      <div>
                        <h1 className="text-4xl font-black font-heading tracking-tight">محرك النمو الذكي</h1>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <p className="text-indigo-200/80 font-bold text-sm">نظام العروض الترويجية النشط</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-slate-300 font-medium leading-relaxed">استخدم أدوات التسويق المتقدمة لإنشاء كوبونات ذكية وعروض بصرية تخطف الأنظار، مصممة خصيصاً لزيادة ولاء عملائك.</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 relative z-10">
                    <Dialog open={isCouponDialogOpen} onOpenChange={setIsCouponDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="h-16 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg shadow-xl shadow-indigo-900/40 hover:scale-[1.05] transition-all active:scale-95 group/btn">
                          <Ticket className="w-6 h-6 ml-3 group-hover/btn:rotate-12 transition-transform" /> إنشاء كوبون ذكي
                        </Button>
                      </DialogTrigger>
                      <DialogContent dir="rtl" className="max-w-2xl rounded-[3rem] p-0 overflow-hidden border-none shadow-2xl">
                        <div className="bg-gradient-to-br from-indigo-700 to-blue-800 p-10 text-white relative">
                          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                          <DialogTitle className="text-3xl font-black flex items-center gap-4">
                            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/20">
                              <Ticket className="w-8 h-8 rotate-12" />
                            </div>
                            هندسة الكوبونات
                          </DialogTitle>
                          <p className="text-indigo-100 mt-2 font-medium opacity-80">صمم عروضاً ترويجية مخصصة لرفع معدل التحويل فوراً</p>
                        </div>
                        <div className="p-10 space-y-8 bg-white">
                          <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-3">
                              <Label className="font-black text-slate-700 text-sm flex items-center gap-2">
                                كود الخصم <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-400 font-bold">PROMO CODE</span>
                              </Label>
                              <Input
                                placeholder="RAMADAN20"
                                value={couponForm.code}
                                onChange={e => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase().replace(/\s/g, '') })}
                                className="h-16 rounded-2xl font-black tracking-[0.2em] text-center text-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:ring-indigo-500 focus:border-indigo-500 shadow-inner"
                              />
                            </div>
                            <div className="space-y-3">
                              <Label className="font-black text-slate-700 text-sm">الشريحة المستهدفة</Label>
                              <Select value={couponForm.userTier} onValueChange={v => setCouponForm({ ...couponForm, userTier: v })}>
                                <SelectTrigger className="h-16 rounded-2xl font-black border-2 border-slate-100 bg-slate-50">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-none shadow-2xl p-2">
                                  <SelectItem value="all" className="font-black py-4 rounded-xl cursor-pointer">🌍 جميع المستخدمين</SelectItem>
                                  <SelectItem value="vip" className="font-black py-4 rounded-xl cursor-pointer text-amber-600">👑 كبار الشخصيات VIP</SelectItem>
                                  <SelectItem value="gold" className="font-black py-4 rounded-xl cursor-pointer text-indigo-600">⭐ المستوى الذهبي</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-6">
                            <div className="space-y-3">
                              <Label className="font-black text-slate-600 text-[10px] uppercase tracking-widest">نوع المكافأة</Label>
                              <Select value={couponForm.discountType} onValueChange={v => setCouponForm({ ...couponForm, discountType: v })}>
                                <SelectTrigger className="h-14 rounded-2xl font-bold bg-slate-50 border-none shadow-sm"><SelectValue /></SelectTrigger>
                                <SelectContent className="rounded-xl"><SelectItem value="percentage">نسبة المئوية %</SelectItem><SelectItem value="fixed">خصم ثابت ﷼</SelectItem></SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-3">
                              <Label className="font-black text-slate-600 text-[10px] uppercase tracking-widest">مقدار الخصم</Label>
                              <Input type="number" value={couponForm.discountValue} onChange={e => setCouponForm({ ...couponForm, discountValue: e.target.value })} className="h-14 rounded-2xl font-black text-xl text-center shadow-sm" />
                            </div>
                            <div className="space-y-3">
                              <Label className="font-black text-slate-600 text-[10px] uppercase tracking-widest">الحد الأدنى</Label>
                              <Input type="number" value={couponForm.minOrderAmount} onChange={e => setCouponForm({ ...couponForm, minOrderAmount: e.target.value })} className="h-14 rounded-2xl font-black text-xl text-center shadow-sm" />
                            </div>
                          </div>

                          <div className="space-y-3">
                            <Label className="font-black text-slate-700 text-sm">قابل للتطبيق على</Label>
                            <Select value={couponForm.applicableProducts} onValueChange={v => setCouponForm({ ...couponForm, applicableProducts: v })}>
                              <SelectTrigger className="h-14 rounded-2xl font-black bg-slate-50 border-none shadow-sm"><SelectValue /></SelectTrigger>
                              <SelectContent className="max-h-60 rounded-xl">
                                <SelectItem value="all" className="font-bold">✨ جميع منتجات المتجر</SelectItem>
                                {products.map(p => <SelectItem key={p.id} value={p.id.toString()} className="font-medium">{p.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="pt-6 border-t flex gap-4">
                            <Button variant="ghost" onClick={() => setIsCouponDialogOpen(false)} className="flex-1 h-16 rounded-2xl font-black text-slate-400 hover:bg-slate-50">تراجع</Button>
                            <Button onClick={() => saveCouponMutation.mutate()} className="flex-[2] h-16 rounded-2xl bg-indigo-600 text-white font-black text-xl shadow-xl shadow-indigo-100 hover:scale-[1.02] transition-all">تفعيل الكوبون الآن</Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={isOfferDialogOpen} onOpenChange={setIsOfferDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="h-16 px-8 rounded-2xl border-white/20 bg-white/5 backdrop-blur-md text-white font-black text-lg hover:bg-white hover:text-slate-900 transition-all border shadow-2xl group/offer">
                          <Gift className="w-6 h-6 ml-3 text-pink-400 group-hover/offer:scale-110 transition-transform" /> إطلاق عرض مرئي
                        </Button>
                      </DialogTrigger>
                      <DialogContent dir="rtl" className="max-w-2xl rounded-[3rem] p-0 overflow-hidden border-none shadow-2xl">
                        <div className="bg-slate-950 p-10 text-white relative">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/20 rounded-full blur-3xl opacity-50" />
                          <h2 className="text-3xl font-black flex items-center gap-4 relative z-10"><ShoppingBag className="text-pink-500 w-10 h-10" /> استوديو العروض البصرية</h2>
                          <p className="text-slate-400 mt-2 font-medium opacity-80">أنشئ بنرات إعلانية احترافية لجذب انتباه العملاء</p>
                        </div>
                        <div className="p-10 space-y-8 bg-slate-50">
                          <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-3">
                              <Label className="font-black text-slate-700">نوع الاستراتيجية</Label>
                              <Select value={offerForm.type} onValueChange={v => setOfferForm({ ...offerForm, type: v })}>
                                <SelectTrigger className="h-14 rounded-2xl font-black bg-white border-none shadow-sm"><SelectValue /></SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  <SelectItem value="banner" className="font-bold py-3 px-4 rounded-lg m-1">🖼️ بنر إعلاني (كبير)</SelectItem>
                                  <SelectItem value="flash_sale" className="font-bold py-3 px-4 rounded-lg m-1 text-orange-600">⚡ فلاش سيل (مؤقت)</SelectItem>
                                  <SelectItem value="bogo" className="font-bold py-3 px-4 rounded-lg m-1 text-pink-600">🎁 اشترِ 1 واحصل على 1</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-3">
                              <Label className="font-black text-slate-700">المنتج المميز (اختياري)</Label>
                              <Select value={offerForm.productId} onValueChange={v => setOfferForm({ ...offerForm, productId: v })}>
                                <SelectTrigger className="h-14 rounded-2xl font-black bg-white border-none shadow-sm"><SelectValue placeholder="اختر منتجاً للربط" /></SelectTrigger>
                                <SelectContent className="rounded-xl max-h-60">
                                  <SelectItem value="none">-- لا يوجد منتج محدد --</SelectItem>
                                  {products.map(p => <SelectItem key={p.id} value={p.id.toString()} className="font-bold">{p.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <Label className="font-black text-slate-700">عنوان الحملة</Label>
                            <Input
                              value={offerForm.title}
                              onChange={e => setOfferForm({ ...offerForm, title: e.target.value })}
                              placeholder="مثال: مهرجان الذبائح الطازجة لشهر رمضان"
                              className="h-16 rounded-2xl font-black text-xl border-none shadow-sm bg-white focus:ring-2 focus:ring-pink-500"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-3">
                              <Label className="font-black text-slate-700">نسبة الخصم %</Label>
                              <div className="relative">
                                <Input type="number" value={offerForm.discountPercentage} onChange={e => setOfferForm({ ...offerForm, discountPercentage: e.target.value })} className="h-14 rounded-2xl font-black text-2xl text-center bg-white border-none shadow-sm" />
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xl">%</span>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <Label className="font-black text-slate-700">رابط الصورة (URL)</Label>
                              <Input value={offerForm.imageUrl} onChange={e => setOfferForm({ ...offerForm, imageUrl: e.target.value })} placeholder="https://image-link.com" className="h-14 rounded-2xl font-medium bg-white border-none shadow-sm px-6" />
                            </div>
                          </div>

                          <Button onClick={() => saveOfferMutation.mutate()} className="w-full h-18 py-6 bg-slate-900 hover:bg-black text-white rounded-3xl font-black text-2xl shadow-2xl shadow-slate-200 mt-4 hover:scale-[1.02] transition-all">إطلاق الحملة الآن 🎉</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  {/* Active Coupons List */}
                  <div className="lg:col-span-12 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-xl"><Ticket className="w-6 h-6 text-indigo-600" /></div>
                        الكوبونات النشطة حالياً
                      </h3>
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 px-4 py-1.5 rounded-full font-black text-xs border-none">
                        قيد العمل ⚡
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {coupons.map((c: any) => {
                        const usageRatio = (c.usedCount || 0) / (c.maxUsage || 100);
                        const isNearEnd = usageRatio > 0.8;
                        const isExpired = c.expiryDate && new Date(c.expiryDate) < new Date();

                        return (
                          <Card key={c.id} className="relative overflow-hidden border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] group bg-white hover:scale-[1.02] transition-all duration-500">
                            <div className="p-8 space-y-6">
                              <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-3xl font-black text-indigo-600 tracking-tighter uppercase select-all">{c.code}</span>
                                    {c.userTier && c.userTier !== 'all' && (
                                      <Badge className="bg-amber-100 text-amber-700 border-none text-[8px] font-black uppercase">
                                        {c.userTier}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs font-bold text-slate-400">خصم {c.discountValue}{c.discountType === 'percentage' ? '%' : ' ﷼'}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-400 hover:bg-red-50 rounded-full"
                                  onClick={async () => {
                                    if (confirm("حذف؟")) {
                                      await supabase.from('coupons').delete().eq('id', c.id);
                                      queryClient.invalidateQueries({ queryKey: ["coupons"] });
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>

                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    <span>معدل الاستهلاك</span>
                                    <span className={isNearEnd ? 'text-red-500 animate-pulse' : 'text-indigo-600'}>
                                      {c.usedCount || 0} / {c.maxUsage || '∞'}
                                    </span>
                                  </div>
                                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
                                    <div
                                      className={`h-full rounded-full transition-all duration-1000 ${isNearEnd ? 'bg-gradient-to-r from-red-500 to-rose-400' : 'bg-gradient-to-r from-indigo-600 to-blue-400'}`}
                                      style={{ width: `${Math.min(((c.usedCount || 0) / (c.maxUsage || 100)) * 100, 100)}%` }}
                                    />
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
                                    <Box className="w-3 h-3 text-emerald-500" />
                                    {c.applicableProducts === 'all' ? 'كل المتجر' : 'منتجات محددة'}
                                  </div>
                                  <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
                                    <Clock className="w-3 h-3 text-amber-500" />
                                    {c.expiryDate || 'مفتوح'}
                                  </div>
                                </div>
                              </div>
                            </div>
                            {isExpired && (
                              <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center p-6 text-center z-10 transition-opacity">
                                <Badge variant="destructive" className="h-10 px-6 rounded-xl font-black text-sm shadow-xl">انتهت صلاحية الكود</Badge>
                              </div>
                            )}
                          </Card>
                        )
                      })}
                      {coupons.length === 0 && (
                        <div className="bg-slate-50 col-span-full py-16 rounded-[2.5rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-center space-y-4">
                          <Ticket className="w-16 h-16 text-slate-200" />
                          <div>
                            <p className="text-xl font-black text-slate-400">لا توجد كوبونات فعال حالياً</p>
                            <p className="text-sm text-slate-300 font-bold">ابدأ بإنشاء أول كوبون لجذب عملائك المترددين</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Visual Offers Showcase */}
                  <div className="lg:col-span-12 space-y-6">
                    <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                      <div className="p-2 bg-pink-100 rounded-xl"><Gift className="w-6 h-6 text-pink-600" /></div>
                      معرض العروض المرئية
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {offers.map((o: any) => {
                        const targetProduct = products.find(p => p.id?.toString() === o.productId?.toString());

                        return (
                          <div key={o.id} className="group relative aspect-[14/16] rounded-[3rem] overflow-hidden shadow-2xl hover:-translate-y-2 transition-all duration-700 bg-slate-900 border border-white/10">
                            <img
                              src={o.imageUrl || '/assets/offer-placeholder.jpg'}
                              className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-110 group-hover:rotate-2 transition-all duration-1000"
                              onError={(e) => { (e.target as HTMLImageElement).src = '/assets/offer-placeholder.jpg' }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                            <div className="absolute top-6 left-6 flex gap-2">
                              <Button
                                size="icon"
                                variant="destructive"
                                className="rounded-2xl opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 h-10 w-10"
                                onClick={async () => {
                                  if (confirm("إزالة هذا العرض؟")) {
                                    await supabase.from('offers').delete().eq('id', o.id);
                                    queryClient.invalidateQueries({ queryKey: ["offers"] });
                                  }
                                }}
                              >
                                <Trash2 className="w-5 h-5" />
                              </Button>
                              <Badge className="bg-white/20 backdrop-blur-md text-white border-white/10 px-3 py-1 font-black text-[10px] uppercase">
                                {o.type?.replace('_', ' ') || 'PROMO'}
                              </Badge>
                            </div>

                            <div className="absolute bottom-0 left-0 right-0 p-8 space-y-4">
                              <div className="space-y-1">
                                <h4 className="text-2xl font-black text-white leading-tight drop-shadow-lg">{o.title}</h4>
                                <p className="text-slate-300 font-bold text-sm line-clamp-2">{o.description || 'احصل على أفضل الأسعار لهذا الموسم حصرياً لدينا'}</p>
                              </div>

                              <div className="flex items-center gap-4 pt-4 border-t border-white/10">
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">خصم فوري</span>
                                  <span className="text-4xl font-black text-white tracking-tighter leading-none">{o.discountPercentage ?? 0}%</span>
                                </div>
                                {targetProduct && (
                                  <div className="mr-auto bg-white/10 backdrop-blur rounded-2xl p-3 flex items-center gap-3 border border-white/5">
                                    <div className="w-10 h-10 rounded-lg bg-white overflow-hidden p-1 shadow-inner">
                                      <img src={targetProduct.image} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">خصم حصري على</span>
                                      <span className="text-xs font-black text-white line-clamp-1">{targetProduct.name}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      {offers.length === 0 && (
                        <div className="bg-slate-50 col-span-full py-20 rounded-[3rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-center space-y-6">
                          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl">
                            <Gift className="w-12 h-12 text-slate-200" />
                          </div>
                          <div>
                            <p className="text-2xl font-black text-slate-400 tracking-tight">لا توجد عروض ترويجية بعد</p>
                            <p className="text-slate-300 font-bold max-w-xs mx-auto">صمم عروضك البصرية الآن واجذب الأنظار لمنتجاتك الأكثر مبيعاً</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          }


          {activeTab === "reports" && (
            <div className="space-y-10 animate-in fade-in-50 duration-700 pb-20">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
                <div>
                  <h1 className="text-4xl font-black font-heading text-slate-900 tracking-tight flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl text-primary">
                      <BarChart3 className="w-8 h-8" />
                    </div>
                    التقارير التحليلية والذكاء
                  </h1>
                  <p className="text-slate-500 font-medium mt-1">تحليل شامل للمبيعات، العملاء، ومناطق التغطية الجغرافية</p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="gap-2 h-12 px-6 rounded-2xl border-slate-200 bg-white shadow-sm font-bold" onClick={() => window.print()}>
                    <Printer className="w-5 h-5" /> تصدير التقرير
                  </Button>
                  <Button className="gap-2 h-12 px-6 rounded-2xl shadow-xl shadow-primary/20 font-bold" onClick={() => queryClient.invalidateQueries()}>
                    تحديث البيانات
                  </Button>
                </div>
              </div>

              {/* Core Stats Bar */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  {
                    label: "إجمالي المبيعات",
                    val: stats.totalSales,
                    icon: TrendingUp,
                    color: "text-blue-600",
                    bg: "bg-blue-50",
                    suffix: " ﷼",
                    trend: "+12.5% من الشهر الماضي"
                  },
                  {
                    label: "إجمالي الطلبات",
                    val: stats.orderCount,
                    icon: ShoppingBag,
                    color: "text-purple-600",
                    bg: "bg-purple-50",
                    suffix: " طلب",
                    trend: "متوسط 5 طلبات يومياً"
                  },
                  {
                    label: "متوسط قيمة الطلب",
                    val: Math.round(stats.totalSales / (stats.orderCount || 1)),
                    icon: PieChart,
                    color: "text-orange-600",
                    bg: "bg-orange-50",
                    suffix: " ﷼",
                    trend: "نمو بنسبة 5%"
                  },
                  {
                    label: "قاعدة العملاء",
                    val: usersList.length,
                    icon: Users,
                    color: "text-emerald-600",
                    bg: "bg-emerald-50",
                    suffix: " عميل",
                    trend: "34 عميل جديد هذا الأسبوع"
                  },
                ].map((stat, i) => (
                  <Card key={i} className="border-none shadow-xl shadow-slate-100/50 hover:shadow-xl hover:scale-[1.02] transition-all p-7 bg-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full -translate-y-12 translate-x-12 group-hover:bg-slate-100 transition-colors" />
                    <div className="relative flex items-center gap-5">
                      <div className={`${stat.bg} ${stat.color} p-4 rounded-[1.5rem] shadow-sm`}>
                        <stat.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">{stat.label}</p>
                        <p className="text-2xl font-black text-slate-900 leading-none">{stat.val.toLocaleString()}<span className="text-xs font-bold mr-1">{stat.suffix}</span></p>
                        <p className="text-[9px] font-bold text-slate-400 mt-2 flex items-center gap-1">
                          <TrendingUp className="w-2.5 h-2.5 text-emerald-500" /> {stat.trend}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Sales Chart */}
                <Card className="lg:col-span-2 border-none shadow-xl shadow-slate-100/50 p-10 bg-white rounded-[3rem] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <TrendingUp className="w-32 h-32 text-indigo-600" />
                  </div>
                  <CardHeader className="px-0 pt-0 mb-8 relative z-10">
                    <CardTitle className="text-2xl font-black flex items-center gap-3 text-slate-900">
                      <TrendingUp className="text-primary w-6 h-6" /> أداء المبيعات الأسبوعي
                    </CardTitle>
                    <CardDescription className="text-slate-400 font-medium">متابعة دقيقة لتدفق الإيرادات اليومي</CardDescription>
                  </CardHeader>
                  <div className="h-[400px] w-full relative z-10">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[
                        { name: 'السبت', value: 4200 },
                        { name: 'الأحد', value: 5100 },
                        { name: 'الإثنين', value: 3800 },
                        { name: 'الثلاثاء', value: 6200 },
                        { name: 'الأربعاء', value: 4500 },
                        { name: 'الخميس', value: 8900 },
                        { name: 'الجمعة', value: 7100 },
                      ]}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#64748b', fontWeight: 700 }} dy={15} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#64748b' }} dx={-15} />
                        <Tooltip
                          contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)', padding: '15px' }}
                          itemStyle={{ fontWeight: '900', color: '#1e293b' }}
                          cursor={{ stroke: '#3b82f6', strokeWidth: 2 }}
                        />
                        <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={5} fillOpacity={1} fill="url(#colorValue)" strokeLinecap="round" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Best Selling Products */}
                <Card className="border-none shadow-xl shadow-slate-100/50 p-10 bg-white rounded-[3rem] relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-50/50 rounded-full blur-3xl -translate-x-10 -translate-y-10" />
                  <CardHeader className="px-0 pt-0 mb-8">
                    <CardTitle className="text-2xl font-black text-slate-900">الأكثر طلباً</CardTitle>
                    <CardDescription className="text-slate-400 font-medium">المنتجات التي تحقق أعلى معدل دوران</CardDescription>
                  </CardHeader>
                  <div className="space-y-8">
                    {products.slice(0, 6).map((prod, i) => (
                      <div key={prod.id} className="flex items-center gap-5 group cursor-pointer">
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 overflow-hidden shrink-0 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                          <img src={prod.image} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex justify-between items-center">
                            <p className="text-sm font-black text-slate-800">{prod.name}</p>
                            <span className="text-[10px] font-black text-indigo-600">{prod.price} ﷼</span>
                          </div>
                          <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${i === 0 ? 'bg-indigo-600' : 'bg-slate-300'} group-hover:bg-indigo-400 transition-colors`}
                              style={{ width: `${95 - (i * 12)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-12 p-8 bg-slate-900 rounded-[2rem] text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000" />
                    <div className="flex items-center gap-3 mb-3 relative z-10">
                      <div className="p-2 bg-white/10 rounded-xl">
                        <TrendingUp className="text-emerald-400 w-5 h-5" />
                      </div>
                      <span className="text-sm font-black tracking-tight">نبض الذكاء الإصطناعي</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-medium relative z-10">
                      "نلاحظ طلباً متزايداً في منطقة <span className="text-indigo-400 font-black">شمال الرياض</span>. نقترح إطلاق حملة توصيل مجاني لهذه المنطقة لزيادة الاستحواذ بنسبة <span className="text-emerald-400 font-black">15%</span>."
                    </p>
                  </div>
                </Card>
              </div>

              {/* Coverage Map Section - Now at Bottom as requested */}

              <Card className="border-none shadow-3xl shadow-slate-200/40 bg-white overflow-hidden rounded-[3rem] h-[800px] relative group transition-all duration-700 border-8 border-slate-50">
                <div className="absolute inset-0">
                  <CoverageMap
                    zones={deliveryZones}
                    orders={orders}
                    onOrderClick={(order) => {
                      setSelectedOrder(order);
                      setIsDetailsDialogOpen(true);
                    }}
                  />
                </div>
              </Card>
            </div>
          )}

          {
            activeTab === "settings" && (
              <div className="space-y-10 animate-in fade-in-50 duration-700 pb-20">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
                  <div>
                    <h1 className="text-4xl font-black font-heading text-slate-900 tracking-tight flex items-center gap-3">
                      <div className="p-2 bg-slate-900 rounded-xl text-white">
                        <Settings className="w-8 h-8" />
                      </div>
                      إدارة المتجر المتقدمة
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">تخصيص الهوية، أوقات العمل، وسياسات المتجر القانونية</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Settings Navigation Sidebar */}
                  <div className="lg:col-span-3 space-y-2 bg-white/50 p-4 rounded-[2.5rem] border border-slate-100 shadow-sm backdrop-blur-sm">
                    {[
                      { id: 'general', label: 'المعلومات العامة', icon: LayoutGrid, color: 'text-blue-600', bg: 'bg-blue-50' },
                      { id: 'hours', label: 'أوقات العمل', icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50' },
                      { id: 'legal', label: 'الصفحات القانونية', icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50' },
                      { id: 'marketing', label: 'الإشعارات والتواصل', icon: Megaphone, color: 'text-pink-600', bg: 'bg-pink-50' },
                      { id: 'system', label: 'النظام والأمان', icon: Lock, color: 'text-slate-600', bg: 'bg-slate-50' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setActiveSettingsTab(item.id)}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl font-black transition-all group ${activeSettingsTab === item.id ? 'bg-white shadow-xl shadow-slate-200/50 text-slate-900' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
                      >
                        <div className={`p-2 rounded-xl transition-all ${activeSettingsTab === item.id ? item.bg + ' ' + item.color : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                          <item.icon className="w-5 h-5" />
                        </div>
                        {item.label}
                        {activeSettingsTab === item.id && <div className="mr-auto w-1.5 h-6 bg-slate-900 rounded-full" />}
                      </button>
                    ))}
                  </div>

                  {/* Settings Content Area */}
                  <div className="lg:col-span-9">
                    <Card className="border-none shadow-2xl shadow-slate-100/50 bg-white rounded-[3rem] overflow-hidden">
                      <div className="p-10">
                        {activeSettingsTab === 'general' && (
                          <div className="space-y-8 animate-in slide-in-from-left-4 duration-500">
                            <div className="flex items-center justify-between">
                              <h3 className="text-2xl font-black text-slate-900">المعلومات العامة والضريبية</h3>
                              <Badge className="bg-blue-100 text-blue-700 font-black px-4 py-1.5 rounded-full border-none">بيانات المتجر الرسمية</Badge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="group space-y-3">
                                <Label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">اسم المنشأة التجاري</Label>
                                <Input
                                  defaultValue={settingsMap.contact_details?.store_name || "ملحمة النعيمي الفاخر"}
                                  onBlur={(e) => updateSettingsMutation.mutate({ contact_details: { ...settingsMap.contact_details, store_name: e.target.value } })}
                                  className="h-16 rounded-2xl bg-slate-50 border-none font-bold text-lg shadow-inner group-focus-within:bg-white group-focus-within:ring-2 ring-blue-500/20 transition-all"
                                />
                              </div>
                              <div className="group space-y-3">
                                <Label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">الرقم الضريبي (VAT)</Label>
                                <Input
                                  defaultValue={settingsMap.contact_details?.tax_number || "300012345600003"}
                                  onBlur={(e) => updateSettingsMutation.mutate({ contact_details: { ...settingsMap.contact_details, tax_number: e.target.value } })}
                                  className="h-16 rounded-2xl bg-slate-50 border-none font-bold text-lg shadow-inner group-focus-within:bg-white group-focus-within:ring-2 ring-blue-500/20 transition-all"
                                />
                              </div>
                              <div className="group space-y-3">
                                <Label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">رقم الدعم (واتساب)</Label>
                                <div className="relative">
                                  <Phone className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
                                  <Input
                                    defaultValue={settingsMap.contact_details?.whatsapp || "0501234567"}
                                    onBlur={(e) => updateSettingsMutation.mutate({ contact_details: { ...settingsMap.contact_details, whatsapp: e.target.value } })}
                                    className="h-16 rounded-2xl bg-slate-50 border-none font-bold text-lg shadow-inner pr-14 group-focus-within:bg-white group-focus-within:ring-2 ring-blue-500/20 transition-all"
                                  />
                                </div>
                              </div>
                              <div className="group space-y-3">
                                <Label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">البريد الإلكتروني الرسمي</Label>
                                <div className="relative">
                                  <Mail className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
                                  <Input
                                    defaultValue={settingsMap.contact_details?.email || "info@alnaemi.com"}
                                    onBlur={(e) => updateSettingsMutation.mutate({ contact_details: { ...settingsMap.contact_details, email: e.target.value } })}
                                    className="h-16 rounded-2xl bg-slate-50 border-none font-bold text-lg shadow-inner pr-14 group-focus-within:bg-white group-focus-within:ring-2 ring-blue-500/20 transition-all"
                                  />
                                </div>
                              </div>
                            </div>

                            <Card className="border-none bg-slate-900 text-white p-8 rounded-[2rem] relative overflow-hidden group">
                              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent" />
                              <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                                <div className="space-y-2">
                                  <h4 className="text-2xl font-black">حالة المتجر الحالية</h4>
                                  <p className="text-blue-200 font-medium">تحكم في ظهور المتجر وقبوله للطلبات للجمهور</p>
                                </div>
                                <div className="flex items-center gap-6 bg-white/10 p-2 rounded-3xl backdrop-blur-md border border-white/10">
                                  <div className={`px-6 py-3 rounded-2xl font-black ${(settingsMap.store_status === 'open' || !settingsMap.store_status) ? 'bg-emerald-500 text-white' : 'text-slate-400'}`}>مفتوح</div>
                                  <Switch
                                    checked={settingsMap.store_status === 'open' || !settingsMap.store_status}
                                    onCheckedChange={(checked) => updateSettingsMutation.mutate({ store_status: checked ? 'open' : 'closed' })}
                                    className="data-[state=checked]:bg-emerald-500"
                                  />
                                  <div className={`px-6 py-3 rounded-2xl font-black ${settingsMap.store_status === 'closed' ? 'bg-rose-500 text-white' : 'text-slate-400'}`}>مغلق</div>
                                </div>
                              </div>
                            </Card>
                          </div>
                        )}

                        {activeSettingsTab === 'hours' && (
                          <div className="space-y-8 animate-in slide-in-from-left-4 duration-500">
                            <div className="flex items-center justify-between">
                              <h3 className="text-2xl font-black text-slate-900">ساعات العمل والجدولة</h3>
                              <Badge className="bg-purple-100 text-purple-700 font-black px-4 py-1.5 rounded-full border-none">توقيت مكة المكرمة</Badge>
                            </div>

                            <div className="space-y-4">
                              {['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map((dayKey) => {
                                const dayNamesMap: Record<string, string> = {
                                  saturday: 'السبت', sunday: 'الأحد', monday: 'الاثنين', tuesday: 'الثلاثاء',
                                  wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة'
                                };
                                const dayData = settingsMap.working_hours?.[dayKey] || { from: "08:00", to: "23:00", closed: false };

                                return (
                                  <div key={dayKey} className="group bg-slate-50 p-6 rounded-3xl flex flex-wrap md:flex-nowrap items-center gap-6 border border-transparent hover:border-purple-100 hover:bg-white hover:shadow-xl hover:shadow-purple-100/50 transition-all duration-300">
                                    <div className="w-24 shrink-0">
                                      <span className="text-xl font-black text-slate-900">{dayNamesMap[dayKey]}</span>
                                    </div>

                                    <div className="flex-1 flex items-center gap-4">
                                      <div className={`p-4 rounded-2xl bg-white border border-slate-200 flex items-center gap-3 ${dayData.closed ? 'opacity-30' : ''}`}>
                                        <Clock className="w-4 h-4 text-slate-400" />
                                        <Input
                                          type="time"
                                          defaultValue={dayData.from}
                                          disabled={dayData.closed}
                                          className="border-none p-0 h-auto bg-transparent font-black text-lg focus-visible:ring-0"
                                          onBlur={(e) => {
                                            const newHours = { ...settingsMap.working_hours };
                                            newHours[dayKey] = { ...dayData, from: e.target.value };
                                            updateSettingsMutation.mutate({ working_hours: newHours });
                                          }}
                                        />
                                        <span className="text-slate-400 font-black px-2">إلى</span>
                                        <Input
                                          type="time"
                                          defaultValue={dayData.to}
                                          disabled={dayData.closed}
                                          className="border-none p-0 h-auto bg-transparent font-black text-lg focus-visible:ring-0"
                                          onBlur={(e) => {
                                            const newHours = { ...settingsMap.working_hours };
                                            newHours[dayKey] = { ...dayData, to: e.target.value };
                                            updateSettingsMutation.mutate({ working_hours: newHours });
                                          }}
                                        />
                                      </div>

                                      <div className="mr-auto flex items-center gap-3">
                                        <Label className={`font-black text-sm ${dayData.closed ? 'text-rose-500' : 'text-slate-400'}`}>{dayData.closed ? 'مغلق' : 'مفتوح'}</Label>
                                        <Switch
                                          checked={!dayData.closed}
                                          onCheckedChange={(checked) => {
                                            const newHours = { ...settingsMap.working_hours };
                                            newHours[dayKey] = { ...dayData, closed: !checked };
                                            updateSettingsMutation.mutate({ working_hours: newHours });
                                          }}
                                          className="data-[state=checked]:bg-emerald-500"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {activeSettingsTab === 'legal' && (
                          <div className="space-y-10 animate-in slide-in-from-left-4 duration-500">
                            <div className="flex items-center justify-between">
                              <h3 className="text-2xl font-black text-slate-900">السياسات والصفحات القانونية</h3>
                              <Badge className="bg-amber-100 text-amber-700 font-black px-4 py-1.5 rounded-full border-none">الامتثال والحقوق</Badge>
                            </div>

                            {[
                              { key: 'legal_terms', title: 'شروط الاستخدام', icon: Scaling },
                              { key: 'legal_privacy', title: 'سياسة الخصوصية', icon: Lock },
                              { key: 'legal_copyright', title: 'حقوق الملكية الفكرية', icon: Award },
                            ].map((item) => (
                              <div key={item.key} className="space-y-4">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-slate-100 rounded-lg"><item.icon className="w-5 h-5 text-slate-600" /></div>
                                  <h4 className="text-lg font-black text-slate-800">{item.title}</h4>
                                </div>
                                <Textarea
                                  defaultValue={settingsMap[item.key]}
                                  placeholder={`اكتب ${item.title} هنا...`}
                                  className="min-h-[200px] rounded-[2rem] p-8 bg-slate-50 border-none font-bold text-slate-700 leading-relaxed shadow-inner group-focus-within:bg-white group-focus-within:ring-2 ring-amber-500/20 transition-all"
                                  onBlur={(e) => updateSettingsMutation.mutate({ [item.key]: e.target.value })}
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {activeSettingsTab === 'system' && (
                          <div className="space-y-8 animate-in slide-in-from-left-4 duration-500">
                            <div className="flex items-center justify-between">
                              <h3 className="text-2xl font-black text-slate-900">النظام والأدوات المتقدمة</h3>
                              <Badge className="bg-slate-100 text-slate-700 font-black px-4 py-1.5 rounded-full border-none">إدارة التقنية</Badge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <Button variant="outline" className="h-24 p-0 rounded-[2rem] overflow-hidden group hover:border-red-200 transition-all border-slate-100">
                                <div className="flex items-center w-full px-8 gap-6">
                                  <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-all">
                                    <AlertTriangle className="w-6 h-6" />
                                  </div>
                                  <div className="text-right">
                                    <p className="font-black text-slate-900">نمط الصيانة</p>
                                    <p className="text-xs text-slate-400 font-medium">إغلاق المتجر للتصحيحات التقنية</p>
                                  </div>
                                </div>
                              </Button>

                              <Button variant="outline" className="h-24 p-0 rounded-[2rem] overflow-hidden group hover:border-blue-200 transition-all border-slate-100">
                                <div className="flex items-center w-full px-8 gap-6">
                                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                                    <FileText className="w-6 h-6" />
                                  </div>
                                  <div className="text-right">
                                    <p className="font-black text-slate-900">النسخ الاحتياطي</p>
                                    <p className="text-xs text-slate-400 font-medium">تصدير قاعدة البيانات بالكامل</p>
                                  </div>
                                </div>
                              </Button>

                              <Button variant="outline" className="h-24 p-0 rounded-[2rem] overflow-hidden group hover:border-emerald-200 transition-all border-slate-100">
                                <div className="flex items-center w-full px-8 gap-6">
                                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                    <CreditCard className="w-6 h-6" />
                                  </div>
                                  <div className="text-right">
                                    <p className="font-black text-slate-900">إدارة الضرائب</p>
                                    <p className="text-xs text-slate-400 font-medium">تحديث نسب القيمة المضافة</p>
                                  </div>
                                </div>
                              </Button>

                              <Button variant="outline" className="h-24 p-0 rounded-[2rem] overflow-hidden group hover:border-slate-200 transition-all border-slate-100">
                                <div className="flex items-center w-full px-8 gap-6">
                                  <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center group-hover:bg-slate-600 group-hover:text-white transition-all">
                                    <Package className="w-6 h-6" />
                                  </div>
                                  <div className="text-right">
                                    <p className="font-black text-slate-900">تحديثات النظام</p>
                                    <p className="text-xs text-slate-400 font-medium">الإصدار الحالي: 3.4.0v</p>
                                  </div>
                                </div>
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            )
          }
        </div>

        {/* Global Order Details Dialog - Premium Redesign */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-5xl h-[92vh] p-0 rounded-[3rem] border-none shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden bg-white" dir="rtl">
            {/* Ultra-Premium Header - Unified In-Card Design */}
            <div className="p-10 pb-6 relative overflow-hidden bg-slate-950 border-b border-indigo-500/10">
              {/* Abstract Glass Background Elements */}
              <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] animate-pulse" />
              <div className="absolute top-1/2 -right-24 w-64 h-64 bg-rose-500/10 rounded-full blur-[80px]" />

              <div className="relative flex flex-col md:flex-row justify-between items-center gap-8">
                {/* Right Side: Title & Date (Arabic RTL) */}
                <div className="flex items-center gap-8 text-right">
                  <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-blue-700 rounded-[2rem] flex items-center justify-center shadow-[0_20px_40px_-5px_rgba(79,70,229,0.4)] border border-white/20 transform hover:rotate-6 transition-transform group">
                    <Package className="w-10 h-10 text-white group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">رقم المرجع العالمي</span>
                      <h2 className="text-4xl font-black text-white tracking-tighter">طلب <span className="text-indigo-400">#{selectedOrder?.id}</span></h2>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400 font-bold bg-white/5 py-2 px-4 rounded-2xl w-fit backdrop-blur-md border border-white/5 shadow-inner">
                      <Calendar className="w-4 h-4 text-indigo-400" />
                      <span className="text-sm">{new Date(selectedOrder?.createdAt || selectedOrder?.created_at || Date.now()).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                  </div>
                </div>

                {/* Left Side: Unified Status Card (Inside the header container) */}
                <div className="flex bg-white/5 p-2 rounded-[2.5rem] border border-white/10 backdrop-blur-xl shadow-2xl items-center gap-4">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg ${selectedOrder?.status === 'completed' ? 'bg-emerald-500 text-white shadow-emerald-500/20' :
                    selectedOrder?.status === 'shipping' ? 'bg-blue-500 text-white shadow-blue-500/20' :
                      selectedOrder?.status === 'preparing' ? 'bg-amber-500 text-white shadow-amber-500/20' :
                        selectedOrder?.status === 'cancelled' ? 'bg-rose-500 text-white shadow-rose-500/20' :
                          'bg-indigo-500 text-white shadow-indigo-500/20'
                    }`}>
                    {selectedOrder?.status === 'completed' ? <Check className="w-7 h-7" /> :
                      selectedOrder?.status === 'shipping' ? <Truck className="w-7 h-7" /> :
                        selectedOrder?.status === 'preparing' ? <UtensilsCrossed className="w-7 h-7" /> :
                          selectedOrder?.status === 'cancelled' ? <X className="w-7 h-7" /> : <Clock className="w-7 h-7" />}
                  </div>
                  <div className="pl-6 pr-2">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">الوضع الحالي للطلب</p>
                    <h3 className={`text-xl font-black ${selectedOrder?.status === 'completed' ? 'text-emerald-400' :
                      selectedOrder?.status === 'shipping' ? 'text-blue-400' :
                        selectedOrder?.status === 'preparing' ? 'text-amber-400' :
                          selectedOrder?.status === 'cancelled' ? 'text-rose-400' : 'text-indigo-400'
                      }`}>
                      {selectedOrder?.status === 'completed' ? 'تم التسليم بنجاح ✨' :
                        selectedOrder?.status === 'shipping' ? 'جاري التوصيل الآن 🚚' :
                          selectedOrder?.status === 'preparing' ? 'تحت التجهيز 👨‍🍳' :
                            selectedOrder?.status === 'cancelled' ? 'تم إلغاء الطلب ⚠️' : 'بانتظار المراجعة ⏳'}
                    </h3>
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable Body with Refined Sections */}
            <ScrollArea className="flex-1 px-10 py-10 bg-slate-50/30">
              <div className="max-w-4xl mx-auto space-y-12 pb-10">

                {/* 1. Key Contacts & Delivery Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Customer Card */}
                  <div className="bg-white p-7 rounded-[2.5rem] shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-100 hover:border-indigo-100 transition-all group">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-500">
                        <UserIcon className="w-6 h-6" />
                      </div>
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">بيانات الهوية</span>
                    </div>
                    <h4 className="text-xl font-black text-slate-900 mb-1">{selectedOrder?.customerName || selectedOrder?.customer_name || 'عميل مجهول'}</h4>
                    <a href={`tel:${selectedOrder?.customerPhone || selectedOrder?.customer_phone}`} className="text-sm font-bold text-slate-500 flex items-center gap-2 hover:text-indigo-600 transition-colors">
                      <Phone className="w-4 h-4 text-emerald-500" /> {selectedOrder?.customerPhone || selectedOrder?.customer_phone}
                    </a>
                  </div>

                  {/* Address Card */}
                  <div className="bg-white p-7 rounded-[2.5rem] shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-100 hover:border-rose-100 transition-all group">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-colors duration-500">
                        <MapPin className="w-6 h-6" />
                      </div>
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">مكان التسليم</span>
                    </div>
                    <p className="text-sm font-bold text-slate-600 leading-relaxed line-clamp-2">{selectedOrder?.address}</p>
                  </div>

                  {/* Payment Card */}
                  <div className="bg-white p-7 rounded-[2.5rem] shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-100 hover:border-emerald-100 transition-all group">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-500">
                        <CreditCard className="w-6 h-6" />
                      </div>
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">الأمان المالي</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 px-4 py-2 rounded-xl border-none font-black text-[12px]">
                        {selectedOrder?.paymentMethod === 'cash' ? 'الدفع نقداً' : 'تحويل إلكتروني'}
                      </Badge>
                      <span className="text-[10px] font-bold text-slate-400">مؤكد ✅</span>
                    </div>
                  </div>
                </div>

                {/* 2. Order Note (if exists) */}
                {selectedOrder?.notes && (
                  <div className="relative bg-[#fffbeb] border-2 border-amber-100/50 p-8 rounded-[3rem] overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/20 rounded-full blur-3xl -translate-y-10 translate-x-10" />
                    <div className="relative flex gap-6 items-start">
                      <div className="p-4 bg-amber-100 text-amber-600 rounded-2xl shadow-inner">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-black text-amber-700 uppercase tracking-widest mb-3">توصيات العميل الخاصة</p>
                        <p className="text-lg font-bold text-amber-900 leading-relaxed italic">"{selectedOrder.notes}"</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Items Table - Expanded Design */}
                <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/20 overflow-hidden min-h-[400px]">
                  <div className="bg-slate-50/50 p-6 border-b border-slate-100 flex justify-between items-center px-10">
                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-4">
                      <ShoppingBag className="w-6 h-6 text-indigo-600" />
                      قائمة المشتريات
                    </h3>
                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-none font-bold px-4 py-1.5 rounded-xl">
                      {selectedOrder?.order_items?.length || 0} منتجات
                    </Badge>
                  </div>
                  <Table>
                    <TableHeader className="bg-white/50">
                      <TableRow className="hover:bg-transparent border-slate-50">
                        <TableHead className="text-right py-6 px-10 font-black text-slate-400 uppercase text-[10px] tracking-widest w-1/3">المنتج والتفاصيل</TableHead>
                        <TableHead className="text-center font-black text-slate-400 uppercase text-[10px] tracking-widest">المعايير والخيارات</TableHead>
                        <TableHead className="text-left py-6 px-8 font-black text-slate-500 uppercase text-[11px] tracking-widest">السعر النهائي</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder?.order_items?.map((item: any) => (
                        <TableRow key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-all group">
                          <TableCell className="py-8 px-8">
                            <div className="flex items-center gap-5">
                              <div className="w-16 h-16 bg-slate-100 rounded-[1.2rem] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-inner">
                                <div className="relative">
                                  <Package className="w-8 h-8 text-slate-400" />
                                  <span className="absolute -top-3 -right-3 bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-4 border-white shadow-md">
                                    {item.quantity}
                                  </span>
                                </div>
                              </div>
                              <div>
                                <p className="font-black text-slate-900 text-lg leading-tight mb-1">{item.productName || item.product_name}</p>
                                <p className="text-xs font-bold text-slate-400">سعر الوحدة: {item.price} ﷼</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap justify-center gap-2">
                              {item.cutting && (
                                <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-none px-4 py-1.5 rounded-xl font-black text-[10px] flex gap-1.5 items-center">
                                  <Scissors className="w-3 h-3" /> {item.cutting}
                                </Badge>
                              )}
                              {item.packaging && (
                                <Badge className="bg-orange-50 text-orange-700 hover:bg-orange-100 border-none px-4 py-1.5 rounded-xl font-black text-[10px] flex gap-1.5 items-center">
                                  <Box className="w-3 h-3" /> {item.packaging}
                                </Badge>
                              )}
                              {item.extras && (
                                <Badge className="bg-purple-50 text-purple-700 hover:bg-purple-100 border-none px-4 py-1.5 rounded-xl font-black text-[10px] flex gap-1.5 items-center">
                                  <UtensilsCrossed className="w-3 h-3" /> {item.extras}
                                </Badge>
                              )}
                              {!item.cutting && !item.packaging && !item.extras && <span className="text-[10px] text-slate-300 font-black uppercase tracking-widest">بدون إضافات</span>}
                            </div>
                          </TableCell>
                          <TableCell className="text-left py-8 px-8">
                            <span className="font-black text-slate-900 text-xl font-mono">{(item.price * item.quantity).toLocaleString()} <span className="text-xs mr-1 text-slate-400 font-bold">﷼</span></span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* 4. Financial Summary - Total Focus */}
                <div className="bg-[#0f172a] p-10 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                    <div className="space-y-5">
                      <div className="flex justify-between items-center text-slate-400">
                        <span className="text-sm font-bold flex items-center gap-3"><BarChart3 className="w-4 h-4" /> المجموع الفرعي</span>
                        <span className="font-black text-white">{(selectedOrder?.total / 1.15).toFixed(2)} ﷼</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-400">
                        <span className="text-sm font-bold flex items-center gap-3">
                          <div className="w-5 h-5 bg-white/5 rounded-lg flex items-center justify-center text-[10px] border border-white/10">%</div>
                          القيمة المضافة (15%)
                        </span>
                        <span className="font-black text-rose-400">{(selectedOrder?.total - (selectedOrder?.total / 1.15)).toFixed(2)} ﷼</span>
                      </div>
                      <div className="h-px bg-white/10 w-full" />
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">جميع الأسعار تشمل ضريبة القيمة المضافة حسب الأنظمة السائدة</p>
                    </div>

                    <div className="flex flex-col items-center md:items-end justify-center">
                      <div className="text-center md:text-right">
                        <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-2 font-heading">المبلغ الإجمالي المستحق</p>
                        <div className="flex items-baseline gap-3 md:justify-end">
                          <span className="text-7xl font-black text-white tracking-tighter leading-none">{selectedOrder?.total}</span>
                          <span className="text-2xl font-black text-indigo-400 tracking-tighter">﷼</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Premium Footer Actions */}
            <div className="p-6 border-t bg-white flex flex-col md:flex-row gap-4 shrink-0 px-10 shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
              <Button
                onClick={() => { setInvoiceOrder(selectedOrder); setIsInvoiceChoiceOpen(true); }}
                className="flex-1 h-14 rounded-[1.25rem] bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-black shadow-[0_15px_30px_-5px_rgba(99,102,241,0.4)] hover:scale-[1.02] transition-all transform-gpu gap-3 active:scale-95"
              >
                <Printer className="w-6 h-6" /> إصدار وطباعة الفاتورة الضريبية
              </Button>
              <Button
                variant="outline"
                className="h-14 px-10 rounded-[1.25rem] border-2 border-slate-200 bg-white font-black text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-all text-base shadow-sm"
                onClick={() => setIsDetailsDialogOpen(false)}
              >
                رجوع للوحة التحكم
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* --- Premium Invoice Choice Dialog --- */}
        <Dialog open={isInvoiceChoiceOpen} onOpenChange={setIsInvoiceChoiceOpen}>
          <DialogContent dir="rtl" className="max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
            <div className="bg-slate-900 p-8 text-white relative">
              <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -translate-x-10 -translate-y-10" />
              <DialogTitle className="text-2xl font-black text-center">خيارات طباعة الفاتورة</DialogTitle>
              <DialogDescription className="text-slate-400 text-center mt-2">اختر الطريقة المناسبة لإصدار الفاتورة</DialogDescription>
            </div>
            <div className="p-8 space-y-4 bg-slate-50">
              <Button
                variant="outline"
                className="w-full h-16 rounded-2xl border-2 flex justify-start gap-4 p-6 hover:bg-white hover:border-indigo-500 group transition-all"
                onClick={() => { handlePrint(invoiceOrder, 'view'); setIsInvoiceChoiceOpen(false); }}
              >
                <div className="p-2 bg-slate-100 rounded-xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                  <Eye className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="font-black text-lg">عرض الفاتورة</p>
                  <p className="text-xs text-slate-500">معاينة التصميم الفخم للفاتورة</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full h-16 rounded-2xl border-2 flex justify-start gap-4 p-6 hover:bg-white hover:border-blue-500 group transition-all"
                onClick={() => { handlePrint(invoiceOrder, 'a4'); setIsInvoiceChoiceOpen(false); }}
              >
                <div className="p-2 bg-slate-100 rounded-xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="font-black text-lg">طباعة A4 أو PDF</p>
                  <p className="text-xs text-slate-500">لحفظها كملف أو طباعتها بجودة عالية</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full h-16 rounded-2xl border-2 flex justify-start gap-4 p-6 hover:bg-white hover:border-emerald-500 group transition-all"
                onClick={() => { handlePrint(invoiceOrder, 'receipt'); setIsInvoiceChoiceOpen(false); }}
              >
                <div className="p-2 bg-slate-100 rounded-xl group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                  <Scissors className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="font-black text-lg">طباعة إيصال (إيصال الصندوق)</p>
                  <p className="text-xs text-slate-500">للأجهزة المتخصصة والطباعة الحرارية</p>
                </div>
              </Button>
            </div>
            <div className="p-4 bg-white border-t flex justify-center">
              <Button variant="ghost" onClick={() => setIsInvoiceChoiceOpen(false)} className="text-slate-400 font-bold hover:bg-slate-50 rounded-xl">إلغاء</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div >
  );
}


import { Navbar } from "@/components/layout/Navbar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2, Clock, MapPin, Scissors, Truck,
  Package, LayoutDashboard, FileText, Settings,
  Users, DollarSign, BarChart3, MessageSquare,
  PenTool, PhoneCall, ExternalLink, Activity,
  Plus, Search, TrendingUp, Gift, Printer, Eye, X
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isPointInPolygon } from "@/lib/geo";
import { supabase } from "@/lib/supabase";
import { Order, OrderItem, Product } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, Cell, PieChart, Pie
} from 'recharts';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChevronsUpDown, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// --- Premium Invoice Templates ---
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

  const itemsTotal = items.reduce((acc: number, item: any) => acc + ((item.price || 0) * (item.quantity || 1)), 0);
  const discountAmount = order.discountAmount || order.discount_amount || 0;

  // Use the delivery fee from our mapping (fetched from zone if missing in order)
  const deliveryFee = order.deliveryFee || 0;

  // If the stored total doesn't seem to include the delivery fee, we calculate the correct one for display
  const finalTotal = order.total > (itemsTotal - discountAmount)
    ? order.total
    : (itemsTotal - discountAmount + deliveryFee);

  const vatRate = 0.15;
  // KSA VAT is usually inclusive. Calculate backward from the total.
  const totalVAT = (finalTotal * (vatRate / (1 + vatRate)));
  const totalExclVAT = finalTotal - totalVAT;

  // For the breakdown, show items subtotal excluding VAT
  const itemsSubtotalExclVAT = (itemsTotal - discountAmount) / (1 + vatRate);
  const itemsVAT = (itemsTotal - discountAmount) - itemsSubtotalExclVAT;

  const discountPercent = itemsTotal > 0 ? Math.round((discountAmount / itemsTotal) * 100) : 0;

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
            <div class="total-row"><span>مجموع الأصناف (شامل الضريبة):</span> <span>${itemsTotal.toFixed(2)} ر.س</span></div>
            ${discountAmount > 0 ? `<div class="total-row" style="color: #e11d48;"><span>الخصم (${discountPercent}%):</span> <span>-${discountAmount.toFixed(2)} ر.س</span></div>` : ''}
            <div style="border-top: 1px dashed #ccc; margin: 2mm 0;"></div>
            <div class="total-row"><span>الإجمالي الخاضع للضريبة:</span> <span>${totalExclVAT.toFixed(2)} ر.س</span></div>
            <div class="total-row"><span>ضريبة القيمة المضافة (15%):</span> <span>${totalVAT.toFixed(2)} ر.س</span></div>
            <div class="total-row grand-total"><span>الإجمالي النهائي (شامل التوصيل):</span> <span>${finalTotal.toFixed(2)} ر.س</span></div>
          </div>
          <div class="qr-box">
             <div style="width: 80px; hieght: 80px; background: #000; margin: 0 auto; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 8px;">QR CODE</div>
          </div>
          <div class="footer">شكراً لزيارتكم</div>
          <script>window.onload = () => { window.print(); setTimeout(() => { window.close(); }, 500); }</script>
        </body>
      </html>
    `;
  }

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
              <p>${order.customerName || order.customer_name || 'عميل'} <br/>${order.customerPhone || order.customer_phone}<br/>${order.address}</p>
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
                <span class="label">مجموع الأصناف:</span>
                <span class="value">${itemsTotal.toFixed(2)} ر.س</span>
              </div>
              ${discountAmount > 0 ? `
              <div class="total-row" style="color: #e11d48;">
                <span class="label">خصم الكود (${discountPercent}%):</span>
                <span class="value">-${discountAmount.toFixed(2)} ر.س</span>
              </div>` : ''}
              <div class="total-row" style="font-size: 13px; color: #666;">
                <span class="label">صافي المبلغ (بدون الضريبة):</span>
                <span class="value">${totalExclVAT.toFixed(2)} ر.س</span>
              </div>
              <div class="total-row" style="font-size: 13px; color: #666;">
                <span class="label">ضريبة القيمة المضافة (15%):</span>
                <span class="value">${totalVAT.toFixed(2)} ر.س</span>
              </div>
              <div class="total-row grand">
                <span class="label">الإجمالي النهائي (شامل التوصيل):</span>
                <span class="value">${finalTotal.toFixed(2)} ر.س</span>
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

// --- Role Components ---

// 1. Butcher/Packer Terminal
export function ButcherTerminal({ orders, staffMembers, products, onPrintRequest }: { orders: any[], staffMembers: any[], products: any[], onPrintRequest: (o: any) => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const currentStaff = useMemo(() => {
    // Try both snake_case and camelCase
    return staffMembers.find(s => s.user_id === user?.id || s.userId === user?.id);
  }, [staffMembers, user]);

  const activePreps = useMemo(() => {
    // 🔍 منطق محسّن:
    // 1. إذا كان الموظف معروفاً: اعرض مهامه + المهام العامة
    // 2. إذا لم يكن معروفاً (مشكلة ربط): اعرض المهام العامة فقط (Pending Broadcast)

    // الطلبات العامة (التي لم يستلمها أحد)
    const broadcast = orders.filter(o => o.status === 'pending' && !o.butcher_staff_id);

    if (!currentStaff) {
      // إذا لم يتم العثور على الموظف، اعرض فقط الطلبات المتاحة للجميع
      return broadcast;
    }

    // الطلبات الخاصة بي (جاري التجهيز أو معلقة ومسندة لي)
    // ⚠️ تمت إزالة 'ready' لكي يختفي الطلب فور تكتمل التجهيز
    const myAssigned = orders.filter(o =>
      o.butcher_staff_id === currentStaff.id &&
      (o.status === 'preparing' || o.status === 'pending')
    );

    // دمج القوائم وإزالة التكرار
    const combined = [...myAssigned, ...broadcast];
    const uniqueIds = new Set(combined.map(o => o.id));
    return Array.from(uniqueIds).map(id => combined.find(o => o.id === id));
  }, [orders, currentStaff]);

  // FIXME: Debug panel - remove after fixing
  const debugInfo = (
    <div className="bg-yellow-50 p-4 mb-4 rounded border border-yellow-200 text-xs font-mono text-left" dir="ltr">
      <p><strong>DEBUG INFO:</strong></p>
      <p>User ID: {user?.id}</p>
      <p>Current Staff: {currentStaff ? `ID: ${currentStaff.id}, Name: ${currentStaff.name}` : '❌ Not Found'}</p>
      <p>Total Orders: {orders.length}</p>
      <p>Pending Orders (Raw): {orders.filter(o => o.status === 'pending').length}</p>
      <p>Broadcast Candidates: {orders.filter(o => o.status === 'pending' && !o.butcher_staff_id).length}</p>
      <p>Active Preps: {activePreps.length}</p>
      <details>
        <summary>First 3 Orders</summary>
        <pre>{JSON.stringify(orders.slice(0, 3).map(o => ({ id: o.id, status: o.status, butcher_id: o.butcher_staff_id })), null, 2)}</pre>
      </details>
    </div>
  );

  const prepHistory = useMemo(() =>
    orders.filter(o => o.butcher_staff_id === currentStaff?.id && (o.status === 'ready' || o.status === 'shipping' || o.status === 'completed')),
    [orders, currentStaff]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      let updates: any = { status };

      if (status === 'ready') {
        // Automatically try to assign an available driver
        const availableDrivers = staffMembers.filter(s => s.role === 'delivery' && s.is_active);

        // Find a driver who isn't currently busy with a delivery
        // Busy = status is 'shipping' or 'arrived'
        const freeDriver = availableDrivers.find(d =>
          !orders.some(o => o.driver_staff_id === d.id && (o.status === 'shipping' || o.status === 'arrived'))
        );

        if (freeDriver) {
          updates.driver_staff_id = freeDriver.id;
          // When assigned automatically, the driver will see it in their "Assigned" list
        }
      }

      const { error } = await supabase.from('orders').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: "تم التحديث", description: "تم تجهيز الطلب بنجاح" });
    }
  });

  const takeOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      if (!currentStaff) throw new Error("لم يتم العثور على سجل الموظف الخاص بك");

      const { data, error } = await supabase
        .from('orders')
        .update({
          butcher_staff_id: currentStaff.id,
          status: 'preparing'
        })
        .eq('id', orderId)
        .is('butcher_staff_id', null)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("عذراً، قام جزار آخر باستلام هذا الطلب للتو!");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: "✅ تمت العملية", description: "تم استلام الطلب للتجهيز" });
    },
    onError: (err: any) => {
      toast({ title: "❌ فشل الاستلام", description: err.message, variant: "destructive" });
    }
  });

  const { data: butcherInventory = [] } = useQuery<any[]>({
    queryKey: ["butcher_inventory"],
    queryFn: async () => {
      const { data, error } = await supabase.from('butcher_inventory').select('*, products(*)');
      if (error) throw error;
      return data || [];
    }
  });

  const updateInventoryMutation = useMutation({
    mutationFn: async ({ productId, quantity, price, actionType }: { productId: number, quantity: number, price: number, actionType: string }) => {
      if (!currentStaff) throw new Error("لم يتم العثور على الموظف");

      // 1. Get current inventory
      const { data: existingRows } = await supabase
        .from('butcher_inventory')
        .select('*')
        .eq('product_id', productId);

      const existing = existingRows && existingRows.length > 0 ? existingRows[0] : null;

      const oldQuantity = existing?.current_quantity || 0;
      const oldPrice = existing?.price_today || 0;

      const newQuantity = actionType === 'add_stock' ? oldQuantity + quantity : quantity;

      // 2. Update or Insert inventory
      if (existing) {
        const { error: updateError } = await supabase
          .from('butcher_inventory')
          .update({
            current_quantity: newQuantity,
            price_today: price,
            staff_id: currentStaff.id, // Update who last updated it
            last_updated: new Date().toISOString()
          })
          .eq('id', existing.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('butcher_inventory')
          .insert({
            product_id: productId,
            staff_id: currentStaff.id,
            current_quantity: newQuantity,
            price_today: price
          });
        if (insertError) throw insertError;
      }

      // 3. Log the change
      await supabase.from('butcher_inventory_logs').insert({
        staff_id: currentStaff.id,
        product_id: productId,
        old_quantity: oldQuantity,
        new_quantity: newQuantity,
        old_price: oldPrice,
        new_price: price,
        action_type: actionType
      });

      // 4. Sync with main products table
      await supabase.from('products').update({
        price: price,
        stock_quantity: newQuantity,
        is_out_of_stock: newQuantity <= 0
      }).eq('id', productId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["butcher_inventory"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "✅ تم التحديث", description: "تم تحديث المخزون والسعر بنجاح في النظام" });
    },
    onError: (error: any) => {
      console.error('Inventory update error:', error);
      toast({
        title: "❌ فشل التحديث",
        description: error.message || "حدث خطأ أثناء تحديث المخزون",
        variant: "destructive"
      });
    }
  });

  return (
    <Tabs defaultValue="active" className="space-y-6">
      {debugInfo}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="hidden md:block">
          <h2 className="text-3xl font-bold font-heading text-primary">محطة التجهيز والتقطيع</h2>
          <p className="text-muted-foreground mt-1">إدارة عمليات التجهيز الفني والوزن</p>
        </div>
        <TabsList className="hidden md:flex bg-primary/5 p-1 h-12 rounded-2xl border border-primary/10 overflow-x-auto scrollbar-hide flex-nowrap w-full justify-start md:justify-center">
          <TabsTrigger value="active" className="rounded-xl px-4 font-bold data-[state=active]:bg-primary data-[state=active]:text-white whitespace-nowrap">المهام النشطة ({activePreps.length})</TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl px-4 font-bold data-[state=active]:bg-primary data-[state=active]:text-white whitespace-nowrap">سجل الإنجاز</TabsTrigger>
          <TabsTrigger value="inventory" className="rounded-xl px-4 font-bold data-[state=active]:bg-primary data-[state=active]:text-white whitespace-nowrap">الجرد</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="active" className="mt-0">
        {/* ... (Existing active content) */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {activePreps.map((order) => (
            <Card key={order.id} className="border-t-4 border-t-rose-500 shadow-lg hover:shadow-xl transition-all overflow-hidden bg-card/50 backdrop-blur-sm">
              <CardHeader className="bg-rose-500/5 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">طلب #{order.id}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1 font-bold">
                      <Clock className="h-4 w-4" />
                      {new Date(order.created_at).toLocaleTimeString('ar-SA')}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className="bg-rose-500 rounded-full px-3">{order.status === 'pending' ? 'جديد' : 'قيد العمل'}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-rose-500 hover:bg-rose-50 rounded-xl"
                      onClick={() => onPrintRequest(order)}
                    >
                      <Printer className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <ScrollArea className="h-48 pr-4 mb-6">
                  <div className="space-y-4">
                    {order.order_items?.map((item: any) => (
                      <div key={item.id} className="bg-white/80 p-4 rounded-2xl space-y-2 border border-rose-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500 opacity-20 group-hover:opacity-100 transition-opacity" />
                        <div className="flex items-center gap-3">
                          <Package className="h-5 w-5 text-rose-500" />
                          <span className="font-black text-lg">{item.product_name}</span>
                          <Badge variant="outline" className="mr-auto border-rose-200 text-rose-700 font-black">x{item.quantity}</Badge>
                        </div>
                        <div className="bg-rose-50/50 p-3 rounded-xl text-sm space-y-1.5 border border-rose-100/50">
                          <p className="text-rose-700 font-bold flex items-center gap-2">
                            <Scissors className="h-4 w-4" />
                            التقطيع: <span className="underline decoration-rose-300 underline-offset-4">{item.cutting || "عادي"}</span>
                          </p>
                          <p className="text-blue-700 font-bold">التغليف: {item.packaging || "عادي"}</p>
                          {item.notes && <p className="text-muted-foreground bg-white/60 p-2 rounded-lg mt-2 text-xs border border-dashed">ملاحظة: {item.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="mt-4 p-4 bg-muted/20 rounded-2xl space-y-2 border border-dashed text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-bold">رقم العميل:</span>
                    <span className="font-black text-primary">{order.customer_phone || "غير متوفر"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-bold">اسم العميل:</span>
                    <span className="font-black">{order.customer_name || "عميل"}</span>
                  </div>
                  {order.notes && (
                    <div className="pt-2 border-t mt-2">
                      <p className="text-rose-600 font-bold">ملاحظات العميل:</p>
                      <p className="text-xs">{order.notes}</p>
                    </div>
                  )}
                </div>

                {!order.butcher_staff_id ? (
                  <Button
                    className="w-full h-14 mt-6 text-lg font-black gap-3 shadow-xl bg-indigo-600 hover:bg-indigo-700 border-none rounded-2xl active:scale-95 transition-all"
                    onClick={() => takeOrderMutation.mutate(order.id)}
                    disabled={takeOrderMutation.isPending}
                  >
                    <Plus className="h-6 w-6" />
                    استلام المهمة
                  </Button>
                ) : (
                  <Button
                    className="w-full h-14 mt-6 text-lg font-black gap-3 shadow-xl bg-gradient-to-r from-rose-600 to-rose-700 border-none rounded-2xl active:scale-95 transition-all"
                    onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'ready' })}
                    disabled={updateStatusMutation.isPending}
                  >
                    <CheckCircle2 className="h-6 w-6" />
                    اكتمل التجهيز
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
          {activePreps.length === 0 && (
            <div className="col-span-full py-24 text-center bg-white/50 backdrop-blur-md rounded-[3rem] border-2 border-dashed border-rose-200">
              <Activity className="h-20 w-20 mx-auto mb-6 text-rose-200 animate-pulse" />
              <p className="text-3xl font-black text-rose-300 font-heading">لا يوجد مهام للتجهيز حالياً</p>
              <p className="text-muted-foreground mt-2">استمتع بقهوتك ريثما يصل طلب جديد ☕</p>
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="history">
        <Card className="rounded-[2.5rem] border-none shadow-xl bg-white/80 backdrop-blur-md p-8">
          <h3 className="text-2xl font-bold mb-6">سجل المهام المكتملة اليوم</h3>
          <div className="space-y-4">
            {prepHistory.slice(0, 10).map(order => (
              <div key={order.id} className="flex items-center justify-between p-6 bg-emerald-50/50 rounded-3xl border border-emerald-100">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black">
                    #{order.id.toString().slice(-3)}
                  </div>
                  <div>
                    <p className="font-bold text-lg">تم التجهيز في {new Date(order.created_at).toLocaleTimeString('ar-SA')}</p>
                    <p className="text-sm text-muted-foreground">{order.order_items?.length} أصناف</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-primary rounded-xl" onClick={() => onPrintRequest(order)}>
                    <Printer className="h-5 w-5" />
                  </Button>
                  <Badge className="bg-emerald-500">مكتمل</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="inventory" className="pb-24">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Add/Update Inventory Form */}
          <Card className="rounded-[2.5rem] p-8 border-none shadow-xl bg-white space-y-6">
            <h3 className="text-2xl font-black text-primary flex items-center gap-2">
              <Plus className="h-6 w-6" />
              تحديث المخزون اليومي
            </h3>

            <InventoryUpdateForm
              products={products}
              onUpdate={(data) => updateInventoryMutation.mutate(data)}
              isPending={updateInventoryMutation.isPending}
            />
          </Card>

          {/* Current Stock View */}
          <div className="space-y-6">
            <h3 className="text-2xl font-black text-primary px-4">حالة المخزون الحالي</h3>
            <div className="grid gap-4">
              {butcherInventory.map((item) => (
                <Card key={item.id} className="p-6 rounded-[2rem] border-none shadow-md bg-white hover:shadow-lg transition-all flex justify-between items-center group">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-primary/5 flex items-center justify-center">
                      <Package className="h-8 w-8 text-primary opacity-60" />
                    </div>
                    <div>
                      <h4 className="font-black text-xl">{item.products?.name}</h4>
                      <p className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        آخر تحديث: {new Date(item.last_updated).toLocaleTimeString('ar-SA')}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className="bg-emerald-500 text-white font-black px-4 py-1.5 rounded-full">
                      {item.current_quantity} {item.products?.unit || 'كجم'}
                    </Badge>
                    <span className="text-lg font-black text-primary">{item.price_today} ر.س</span>
                  </div>
                </Card>
              ))}
              {butcherInventory.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  لا يوجد بيانات مخزون حالية
                </div>
              )}
            </div>
          </div>
        </div>
      </TabsContent>

      {/* Mobile Bottom Navigation for Butcher */}
      <div className="md:hidden fixed bottom-6 left-6 right-6 bg-white/95 backdrop-blur-2xl border border-primary/10 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2.5rem] p-3 flex justify-around items-center z-50">
        <TabsList className="bg-transparent w-full h-auto p-0 flex justify-between border-none">
          <TabsTrigger
            value="active"
            className="flex-1 flex flex-col items-center gap-1.5 bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none p-0 group"
          >
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center transition-all group-data-[state=active]:bg-rose-500 group-data-[state=active]:text-white bg-slate-50 text-slate-400">
              <Activity className="h-6 w-6" />
            </div>
            <span className="text-[10px] font-black group-data-[state=active]:text-rose-600">الرئيسي</span>
          </TabsTrigger>

          <TabsTrigger
            value="history"
            className="flex-1 flex flex-col items-center gap-1.5 bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none p-0 group"
          >
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center transition-all group-data-[state=active]:bg-rose-500 group-data-[state=active]:text-white bg-slate-50 text-slate-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <span className="text-[10px] font-black group-data-[state=active]:text-rose-600">سجل الانجاز</span>
          </TabsTrigger>

          <TabsTrigger
            value="inventory"
            className="flex-1 flex flex-col items-center gap-1.5 bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none p-0 group"
          >
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center transition-all group-data-[state=active]:bg-rose-500 group-data-[state=active]:text-white bg-slate-50 text-slate-400">
              <Package className="h-6 w-6" />
            </div>
            <span className="text-[10px] font-black group-data-[state=active]:text-rose-600">الجرد</span>
          </TabsTrigger>
        </TabsList>
      </div>
    </Tabs>
  );
}

function InventoryUpdateForm({ products, onUpdate, isPending }: { products: any[], onUpdate: (d: any) => void, isPending: boolean }) {
  const [productId, setProductId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [action, setAction] = useState<string>("update");

  const [open, setOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !quantity || !price) return;
    onUpdate({
      productId: parseInt(productId),
      quantity: parseFloat(quantity),
      price: parseFloat(price),
      actionType: action
    });
    setProductId("");
    setQuantity("");
    setPrice("");
  };

  const selectedProduct = products.find(p => p.id.toString() === productId);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-bold text-muted-foreground pr-2 text-right block">اختر المنتج</label>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full h-14 rounded-2xl border-2 justify-between px-4 font-black text-lg bg-white hover:bg-slate-50"
            >
              <ChevronsUpDown className="ml-2 h-5 w-5 shrink-0 opacity-50" />
              {productId
                ? products.find((p) => p.id.toString() === productId)?.name
                : "اختر الصنف..."}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-2xl shadow-2xl border-2 overflow-hidden" align="start">
            <Command className="font-heading">
              <CommandInput placeholder="ابحث عن منتج..." className="h-14 font-bold text-right" dir="rtl" />
              <CommandList className="max-h-[300px]">
                <CommandEmpty className="py-6 font-bold text-muted-foreground">لم يتم العثور على نتائج</CommandEmpty>
                <CommandGroup>
                  {products.map((p) => (
                    <CommandItem
                      key={p.id}
                      value={p.name}
                      onSelect={() => {
                        setProductId(p.id.toString());
                        setOpen(false);
                      }}
                      className="flex items-center justify-between py-4 px-4 cursor-pointer hover:bg-primary/5 transition-colors font-black text-right"
                      dir="rtl"
                    >
                      <Check
                        className={`ml-2 h-5 w-5 text-primary transition-opacity ${productId === p.id.toString() ? "opacity-100" : "opacity-0"}`}
                      />
                      <span className="text-lg">{p.name}</span>
                      <span className="text-xs text-muted-foreground mr-auto">({p.unit})</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-bold text-muted-foreground pr-2 text-right block">الكمية</label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full h-14 bg-slate-50 rounded-2xl p-4 border-2 border-transparent focus:border-primary outline-none transition-all font-black text-center"
              placeholder="0.0"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-muted-foreground pr-2 text-right block">سعر اليوم (ر.س)</label>
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full h-14 bg-slate-50 rounded-2xl p-4 border-2 border-transparent focus:border-primary outline-none transition-all font-black text-center"
            placeholder="0.00"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button
          type="button"
          variant={action === 'update' ? 'default' : 'outline'}
          className="h-14 rounded-2xl font-black"
          onClick={() => setAction('update')}
        >
          تحديث الكمية (جديد)
        </Button>
        <Button
          type="button"
          variant={action === 'add_stock' ? 'default' : 'outline'}
          className="h-14 rounded-2xl font-black"
          onClick={() => setAction('add_stock')}
        >
          إضافة للموجود (+)
        </Button>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full h-16 bg-primary hover:bg-primary/90 text-white text-xl font-black rounded-2xl shadow-xl mt-4"
      >
        {isPending ? "جاري الحفظ..." : "تأكيد التحديث 💾"}
      </Button>
    </form>
  );
}

// 2. Delivery Driver Portal
export function DeliveryPortal({ orders, staffMembers, onPrintRequest }: { orders: any[], staffMembers: any[], onPrintRequest: (o: any) => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const currentStaff = useMemo(() =>
    staffMembers.find(s => s.user_id === user?.id || s.userId === user?.id),
    [staffMembers, user]);

  // Orders explicitly assigned to me
  const myAssignedOrders = useMemo(() =>
    orders.filter(o => o.driver_staff_id === currentStaff?.id && (o.status === 'ready' || o.status === 'shipping' || o.status === 'arrived')),
    [orders, currentStaff]);

  // Orders that NO ONE has taken yet
  const broadcastOrders = useMemo(() =>
    orders.filter(o => o.status === 'ready' && !o.driver_staff_id),
    [orders]);

  // Are we currently delivering something?
  const isBusy = useMemo(() =>
    myAssignedOrders.some(o => o.status === 'shipping' || o.status === 'arrived'),
    [myAssignedOrders]);

  // Final list: what I'm already doing + what's available (if I'm not busy)
  const displayedOrders = useMemo(() => {
    if (isBusy) return myAssignedOrders;

    // Combine unique IDs
    const combined = [...myAssignedOrders, ...broadcastOrders];
    const uniqueIds = new Set(combined.map(o => o.id));
    return Array.from(uniqueIds).map(id => combined.find(o => o.id === id));
  }, [myAssignedOrders, broadcastOrders, isBusy]);

  const deliveryHistory = useMemo(() =>
    orders.filter(o => o.driver_staff_id === currentStaff?.id && (o.status === 'completed' || o.status === 'cancelled')),
    [orders, currentStaff]);

  // Real earnings calculations
  const todayEarnings = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = orders.filter(o =>
      o.driver_staff_id === currentStaff?.id &&
      o.status === 'completed' &&
      new Date(o.updated_at) >= today
    );

    const revenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    // Assuming 15% commission for drivers
    return Math.round(revenue * 0.15);
  }, [orders, currentStaff]);

  const weekEarnings = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const weekOrders = orders.filter(o =>
      o.driver_staff_id === currentStaff?.id &&
      o.status === 'completed' &&
      new Date(o.updated_at) >= weekAgo
    );

    const revenue = weekOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    return Math.round(revenue * 0.15);
  }, [orders, currentStaff]);

  const totalBalance = useMemo(() => {
    const completedOrders = orders.filter(o =>
      o.driver_staff_id === currentStaff?.id &&
      o.status === 'completed'
    );

    const revenue = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    return Math.round(revenue * 0.15);
  }, [orders, currentStaff]);

  const todayOrdersCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return orders.filter(o =>
      o.driver_staff_id === currentStaff?.id &&
      o.status === 'completed' &&
      new Date(o.updated_at) >= today
    ).length;
  }, [orders, currentStaff]);

  const weekOrdersCount = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    return orders.filter(o =>
      o.driver_staff_id === currentStaff?.id &&
      o.status === 'completed' &&
      new Date(o.updated_at) >= weekAgo
    ).length;
  }, [orders, currentStaff]);

  // Generate real transaction history
  const transactions = useMemo(() => {
    const completedOrders = orders
      .filter(o => o.driver_staff_id === currentStaff?.id && o.status === 'completed')
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 10) // Last 10 transactions
      .map(o => ({
        date: new Date(o.updated_at).toLocaleDateString('ar-SA'),
        amount: Math.round((o.total || 0) * 0.15),
        type: 'رحلة توصيل',
        status: 'completed',
        orderId: o.id
      }));

    return completedOrders;
  }, [orders, currentStaff]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      const { error } = await supabase.from('orders').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: "تم التحديث", description: "تم تغيير حالة الطلب" });
    }
  });

  const takeOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      if (!currentStaff) throw new Error("لم يتم العثور على سجل الموظف الخاص بك");

      // Atomic-ish check: Only update if driver_staff_id is still null
      const { data, error } = await supabase
        .from('orders')
        .update({
          driver_staff_id: currentStaff.id,
          status: 'shipping'
        })
        .eq('id', orderId)
        .is('driver_staff_id', null)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("عذراً، قام سائق آخر باستلام هذا الطلب للتو!");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: "✅ تمت العملية", description: "تم استلام الطلب، توجه لموقع العميل الآن" });
    },
    onError: (err: any) => {
      toast({ title: "❌ فشل الاستلام", description: err.message, variant: "destructive" });
    }
  });

  const openGoogleMaps = (address: string, lat?: number | null, lng?: number | null) => {
    if (lat && lng) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
    } else {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
    }
  };

  return (
    <Tabs defaultValue="active" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold font-heading text-primary">بوابة مندوب التوصيل</h2>
          <p className="text-muted-foreground mt-1">إدارة الرحلات وتأكيد وصول الطلبات</p>
        </div>
        {/* Desktop Navigation - Always visible on desktop */}
        <TabsList className="hidden md:flex bg-emerald-500/5 p-1 h-12 rounded-2xl border border-emerald-500/10">
          <TabsTrigger value="active" className="rounded-xl px-6 font-bold data-[state=active]:bg-emerald-600 data-[state=active]:text-white">طلبات التوصيل</TabsTrigger>
          <TabsTrigger value="wallet" className="rounded-xl px-6 font-bold data-[state=active]:bg-emerald-600 data-[state=active]:text-white">المحفظة</TabsTrigger>
          <TabsTrigger value="stats" className="rounded-xl px-6 font-bold data-[state=active]:bg-emerald-600 data-[state=active]:text-white">الإحداثيات والسجل</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="active" className="mt-0">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-2">
          {displayedOrders.map((order) => (
            <Card key={order.id} className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[3rem] overflow-hidden group hover:scale-[1.02] transition-all duration-500 bg-white border-4 border-transparent hover:border-emerald-500/20">
              <CardContent className="p-0">
                <div className="relative p-10 bg-slate-950 text-white overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="relative z-10 flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-emerald-500 font-black tracking-widest text-xs uppercase">الطلب الحالي</span>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <h3 className="font-black text-5xl tracking-tighter">#{order.id.toString().slice(-4)}</h3>
                      <div className="flex items-center gap-2 mt-4 bg-white/5 border border-white/10 px-5 py-2 rounded-2xl backdrop-blur-md w-fit font-black text-sm">
                        <Clock className="h-4 w-4 text-emerald-400" />
                        <span>منذ {Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000)} دقيقة</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-4">
                      <div className="bg-emerald-600 p-8 rounded-[2.5rem] text-center border-4 border-white/10 shadow-2xl shadow-emerald-900/40 min-w-[160px] transform group-hover:rotate-3 transition-transform">
                        <p className="text-[10px] text-emerald-100 font-black uppercase tracking-widest mb-2">القيمة الإجمالية</p>
                        <p className="text-4xl font-black tabular-nums">{order.total} <span className="text-lg opacity-60">﷼</span></p>
                      </div>
                      <Button
                        variant="ghost"
                        className="h-12 px-6 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black gap-2 border border-white/10"
                        onClick={() => onPrintRequest(order)}
                      >
                        <Printer className="h-5 w-5" /> طباعة الفاتورة
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-10 space-y-10">
                  <div className="space-y-6">
                    <div className="flex items-center gap-6 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 group-hover:bg-slate-100/50 transition-colors">
                      <div className="h-16 w-16 bg-slate-900 text-white rounded-[1.5rem] flex items-center justify-center shadow-xl">
                        <Users className="h-8 w-8" />
                      </div>
                      <div>
                        <p className="font-black text-2xl text-slate-900">{order.customer_name || 'عميل مجهول'}</p>
                        <p className="font-bold text-slate-500 flex items-center gap-2 mt-1">
                          <PhoneCall className="h-4 w-4" /> {order.customer_phone}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 p-8 bg-emerald-50 rounded-[2.5rem] border border-emerald-100 group-hover:bg-emerald-100/50 transition-colors">
                      <div className="h-16 w-16 bg-emerald-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-emerald-200">
                        <MapPin className="h-8 w-8" />
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-lg text-emerald-900 line-clamp-2 leading-relaxed">{order.address}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      className="h-16 rounded-[1.5rem] border-2 border-slate-200 font-black text-lg gap-3 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all active:scale-95"
                      onClick={() => window.open(`tel:${order.customer_phone || ''}`)}
                    >
                      <PhoneCall className="h-6 w-6" />
                      اتصال
                    </Button>
                    <Button
                      variant="outline"
                      className="h-16 rounded-[1.5rem] border-2 border-emerald-200 font-black text-lg gap-3 text-emerald-600 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all active:scale-95"
                      onClick={() => openGoogleMaps(order.address, (order as any).gps_lat || (order as any).gpsLat, (order as any).gps_lng || (order as any).gpsLng)}
                    >
                      <ExternalLink className="h-6 w-6" />
                      الخريطة
                    </Button>
                  </div>

                  {!order.driver_staff_id ? (
                    <Button
                      className="w-full h-24 bg-indigo-600 hover:bg-indigo-700 text-3xl font-black gap-4 rounded-[2.5rem] shadow-2xl shadow-indigo-200 transition-all hover:-translate-y-2 active:translate-y-px"
                      onClick={() => takeOrderMutation.mutate(order.id)}
                      disabled={takeOrderMutation.isPending || isBusy}
                    >
                      {isBusy ? "أنهِ طلبك الحالي أولاً" : "قبول وتوصيل الطلب ⚡"}
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      {order.status === 'ready' && (
                        <Button
                          className="w-full h-24 bg-emerald-600 hover:bg-emerald-700 text-3xl font-black gap-4 rounded-[2.5rem] shadow-2xl shadow-emerald-200 transition-all hover:-translate-y-2 active:translate-y-px"
                          onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'shipping' })}
                        >
                          <Truck className="h-10 w-10" />
                          تأكيد الاستلام
                        </Button>
                      )}
                      {order.status === 'shipping' && (
                        <Button
                          className="w-full h-24 bg-amber-500 hover:bg-amber-600 text-3xl font-black gap-4 rounded-[2.5rem] shadow-2xl shadow-amber-200 transition-all hover:-translate-y-2 active:translate-y-px"
                          onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'arrived' })}
                        >
                          <Activity className="h-10 w-10 text-white" />
                          وصلت للموقع
                        </Button>
                      )}
                      {order.status === 'arrived' && (
                        <Button
                          className="w-full h-24 bg-slate-900 hover:bg-slate-800 text-3xl font-black gap-4 rounded-[2.5rem] shadow-2xl shadow-slate-200 transition-all hover:-translate-y-2 active:translate-y-px"
                          onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'completed' })}
                        >
                          <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                          إتمام التسليم
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {displayedOrders.length === 0 && (
            <div className="col-span-full py-40 text-center bg-slate-50 rounded-[4rem] border-4 border-dashed border-slate-200">
              <div className="h-32 w-32 bg-white rounded-[3rem] shadow-xl flex items-center justify-center mx-auto mb-10 group-hover:rotate-12 transition-transform">
                <Truck className="h-16 w-16 text-slate-300" />
              </div>
              <h3 className="text-4xl font-black text-slate-900 font-heading">لا يوجد مهام حالية</h3>
              <p className="text-slate-500 mt-4 text-xl font-bold max-w-md mx-auto leading-relaxed">أنت الآن في وضع الانتظار.. سيتم تنبيهك فور توفر طلبات جديدة في نطاقك.</p>
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="wallet" className="space-y-8 pb-24 md:pb-0">
        {/* Earnings Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-8 rounded-[2.5rem] text-center border-none bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-xl">
            <p className="font-bold opacity-80 text-sm">أرباح اليوم</p>
            <p className="text-5xl font-black mt-4 mb-2">{todayEarnings} ﷼</p>
            <p className="text-emerald-100 text-sm font-bold">من {todayOrdersCount} رحلات</p>
          </Card>

          <Card className="p-8 rounded-[2.5rem] text-center border-none bg-white shadow-xl">
            <p className="font-bold text-slate-500 text-sm">أرباح هذا الأسبوع</p>
            <p className="text-5xl font-black mt-4 mb-2 text-indigo-600">{weekEarnings} ﷼</p>
            <p className="text-slate-400 text-sm font-bold">من {weekOrdersCount} رحلة</p>
          </Card>

          <Card className="p-8 rounded-[2.5rem] text-center border-none bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-xl">
            <p className="font-bold opacity-80 text-sm">الرصيد الكلي</p>
            <p className="text-5xl font-black mt-4 mb-2">{totalBalance} ﷼</p>
            <p className="text-amber-100 text-sm font-bold">قابل للسحب</p>
          </Card>
        </div>

        {/* Payout Options */}
        <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
          <div className="p-8 border-b bg-slate-50">
            <h3 className="text-2xl font-black text-slate-900">طلب صرف الأرباح</h3>
            <p className="text-slate-500 font-bold mt-1">اختر طريقة استلام أرباحك</p>
          </div>
          <div className="p-8 space-y-4">
            <Button className="w-full h-20 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-xl font-black rounded-[2rem] shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 gap-3">
              <DollarSign className="h-8 w-8" />
              تحويل بنكي فوري
            </Button>
            <Button variant="outline" className="w-full h-20 border-2 border-slate-200 text-slate-700 text-xl font-black rounded-[2rem] hover:bg-slate-50 transition-all gap-3">
              <Activity className="h-8 w-8" />
              استلام نقدي في الفرع
            </Button>
          </div>
        </Card>

        {/* Transaction History */}
        <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
          <div className="p-8 border-b bg-slate-50">
            <h3 className="text-2xl font-black text-slate-900">سجل المعاملات المالية</h3>
            <p className="text-slate-500 font-bold mt-1">آخر العمليات على محفظتك</p>
          </div>
          <ScrollArea className="h-[400px]">
            <div className="p-6 space-y-4">
              {transactions.length > 0 ? (
                transactions.map((transaction, idx) => (
                  <div key={idx} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className="bg-emerald-100 text-emerald-600 h-14 w-14 rounded-2xl flex items-center justify-center">
                        ✅
                      </div>
                      <div>
                        <p className="font-black text-lg text-slate-900">{transaction.type} - طلب #{transaction.orderId}</p>
                        <p className="text-sm text-slate-400 font-bold">{transaction.date}</p>
                      </div>
                    </div>
                    <div className="text-2xl font-black text-emerald-600">
                      +{transaction.amount} ﷼
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center text-slate-400">
                  <Package className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="font-bold">لا يوجد سجلات سابقة للعرض</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>
      </TabsContent>

      <TabsContent value="stats" className="space-y-8 pb-24 md:pb-0">
        {/* Performance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-8 rounded-[2.5rem] text-center border-none bg-white shadow-xl">
            <div className="h-20 w-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-black">4.9</div>
            <p className="font-black text-xl">تقييم العملاء</p>
            <p className="text-slate-400 mt-2 font-bold">ممتاز جداً 🌟</p>
          </Card>

          <Card className="p-8 rounded-[2.5rem] text-center border-none bg-white shadow-xl">
            <div className="h-20 w-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-black">{deliveryHistory.length}</div>
            <p className="font-black text-xl">إجمالي الرحلات</p>
            <p className="text-slate-400 mt-2 font-bold">رحلة ناجحة</p>
          </Card>

          <Card className="p-8 rounded-[2.5rem] text-center border-none bg-white shadow-xl">
            <div className="h-20 w-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-black">99%</div>
            <p className="font-black text-xl">نسبة الالتزام</p>
            <p className="text-slate-400 mt-2 font-bold">دقة في المواعيد</p>
          </Card>
        </div>

        {/* History List */}
        <Card className="rounded-[2.5rem] border-none shadow-[0_10px_40px_rgba(0,0,0,0.05)] bg-white overflow-hidden">
          <div className="p-8 border-b bg-slate-50">
            <h3 className="text-2xl font-black text-slate-900">سجل التوصيلات السابق</h3>
            <p className="text-slate-500 font-bold mt-1">أرشيف كامل لجميع رحلاتك الناجحة</p>
          </div>
          <ScrollArea className="h-[500px]">
            <div className="p-6 space-y-4">
              {deliveryHistory.map(order => (
                <div key={order.id} className="flex items-center justify-between p-6 bg-white rounded-3xl border-2 border-slate-50 hover:border-emerald-100 transition-all group">
                  <div className="flex items-center gap-6">
                    <div className="h-16 w-16 rounded-2xl bg-slate-100 group-hover:bg-slate-900 group-hover:text-white flex flex-col items-center justify-center text-slate-400 transition-colors">
                      <span className="text-[9px] font-black uppercase">طلب</span>
                      <span className="text-lg font-black">#{order.id}</span>
                    </div>
                    <div>
                      <p className="font-black text-lg text-slate-900">{order.customer_name || 'عميل'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="border-none bg-emerald-50 text-emerald-600 font-bold rounded-lg px-2">مكتمل</Badge>
                        <span className="text-xs text-slate-400 font-bold">{new Date(order.updated_at).toLocaleDateString('ar-SA')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-xl font-black text-emerald-600">{order.total} ﷼</p>
                  </div>
                </div>
              ))}
              {deliveryHistory.length === 0 && (
                <div className="py-20 text-center text-slate-400">
                  <Package className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="font-bold">لا يوجد سجلات سابقة للعرض</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>
      </TabsContent>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 pb-safe px-6 py-4 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] rounded-t-[2rem]">
        <TabsList className="bg-transparent w-full h-auto p-0 flex justify-between">
          <TabsTrigger
            value="active"
            className="flex-1 flex flex-col items-center gap-2 bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none p-0"
          >
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center transition-all data-[state=active]:bg-emerald-600 data-[state=active]:text-white bg-slate-50 text-slate-400 group-data-[state=active]:scale-110">
              <Truck className="h-6 w-6" />
            </div>
            <span className="text-[10px] font-black text-slate-400 data-[state=active]:text-emerald-800">طلبات التوصيل</span>
          </TabsTrigger>

          <TabsTrigger
            value="wallet"
            className="flex-1 flex flex-col items-center gap-2 bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none p-0"
          >
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center transition-all data-[state=active]:bg-emerald-600 data-[state=active]:text-white bg-slate-50 text-slate-400">
              <DollarSign className="h-6 w-6" />
            </div>
            <span className="text-[10px] font-black text-slate-400 data-[state=active]:text-emerald-800">المحفظة</span>
          </TabsTrigger>

          <TabsTrigger
            value="stats"
            className="flex-1 flex flex-col items-center gap-2 bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none p-0"
          >
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center transition-all data-[state=active]:bg-emerald-600 data-[state=active]:text-white bg-slate-50 text-slate-400">
              <MapPin className="h-6 w-6" />
            </div>
            <span className="text-[10px] font-black text-slate-400 data-[state=active]:text-emerald-800">الإحداثيات والسجل</span>
          </TabsTrigger>
        </TabsList>
      </div>
    </Tabs>
  );
}

function ButcherAuditLogs() {
  const { data: logs = [] } = useQuery<any[]>({
    queryKey: ["butcher_inventory_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('butcher_inventory_logs')
        .select('*, products(name, unit), staff(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  return (
    <div className="space-y-6">
      {logs.map((log) => (
        <div key={log.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100 group hover:bg-white hover:shadow-xl transition-all">
          <div className="flex items-center gap-6">
            <div className={`h-16 w-16 rounded-2xl flex items-center justify-center text-white shadow-lg ${log.action_type === 'add_stock' ? 'bg-emerald-500' :
              log.action_type === 'daily_price_change' ? 'bg-amber-500' : 'bg-indigo-500'
              }`}>
              {log.action_type === 'add_stock' ? <Plus className="h-8 w-8" /> : <TrendingUp className="h-8 w-8" />}
            </div>
            <div>
              <p className="font-black text-lg text-slate-900">
                {log.action_type === 'add_stock' ? 'إضافة مخزون' : 'تحديث يومي'} - {log.products?.name}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[10px] font-bold py-0">{log.staff?.name || 'جزار'}</Badge>
                <span className="text-[11px] text-slate-400 font-bold">{new Date(log.created_at).toLocaleString('ar-SA')}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-8 text-left">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase">الكمية</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 line-through text-xs">{log.old_quantity}</span>
                <span className="font-black text-emerald-600">← {log.new_quantity}</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase">السعر</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 line-through text-xs font-bold">{log.old_price}</span>
                <span className="font-black text-primary">← {log.new_price} ر.س</span>
              </div>
            </div>
          </div>
        </div>
      ))}
      {logs.length === 0 && (
        <div className="py-20 text-center text-slate-400">
          <FileText className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="font-bold">لا يوجد سجلات تحديث حتى الآن</p>
        </div>
      )}
    </div>
  );
}

// 3. Manager / Operations Portal
export function ManagerPortal({ orders, staffMembers }: { orders: any[], staffMembers: any[] }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const butchers = useMemo(() => staffMembers.filter(s => s.role === 'butcher' && s.is_active), [staffMembers]);
  const drivers = useMemo(() => staffMembers.filter(s => s.role === 'delivery' && s.is_active), [staffMembers]);

  const activeOrders = useMemo(() =>
    orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled'),
    [orders]);

  const updateAssignmentMutation = useMutation({
    mutationFn: async ({ id, butcherId, driverId, status }: { id: number, butcherId?: number, driverId?: number, status?: string }) => {
      const updates: any = {};
      if (butcherId !== undefined) updates.butcher_staff_id = butcherId;
      if (driverId !== undefined) updates.driver_staff_id = driverId;
      if (status !== undefined) updates.status = status;

      const { error } = await supabase.from('orders').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: "تم التحديث", description: "تم تحديث بيانات الطلب" });
    }
  });

  const autoProcess = async () => {
    const pendingOrders = orders.filter(o => o.status === 'pending');
    if (pendingOrders.length === 0) {
      toast({ title: "لا يوجد طلبات", description: "جميع الطلبات قيد المعالجة" });
      return;
    }

    toast({ title: "جاري المعالجة التلقائية", description: "يتم توزيع المهام على الكادر المتاح..." });

    for (const order of pendingOrders) {
      // Logic for Butcher: Least busy
      const butcherLoad = butchers.map(b => ({
        id: b.id,
        count: orders.filter(o => o.butcher_staff_id === b.id && o.status === 'preparing').length
      })).sort((a, b) => a.count - b.count);

      const selectedButcher = butcherLoad[0]?.id;

      if (selectedButcher) {
        await supabase.from('orders').update({
          butcher_staff_id: selectedButcher,
          status: 'preparing'
        }).eq('id', order.id);
      }
    }

    // Logic for Ready Orders: Assign to available drivers
    const readyOrders = orders.filter(o => o.status === 'ready' && !o.driver_staff_id);
    for (const order of readyOrders) {
      const activeDrivers = drivers.filter(d =>
        !orders.some(o => o.driver_staff_id === d.id && o.status === 'shipping')
      );

      if (activeDrivers.length > 0) {
        await supabase.from('orders').update({
          driver_staff_id: activeDrivers[0].id,
          status: 'shipping'
        }).eq('id', order.id);
      }
    }

    queryClient.invalidateQueries({ queryKey: ["orders"] });
    toast({ title: "اكتملت المعالجة", description: "تم توزيع الطلبات تلقائياً" });
  };

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold font-heading text-primary">بوابة مدير العمليات</h2>
          <p className="text-muted-foreground mt-1">الرقابة الكاملة على سير العمل والموظفين</p>
        </div>
        <TabsList className="bg-indigo-500/5 p-1 h-12 rounded-2xl border border-indigo-500/10 overflow-x-auto scrollbar-hide flex-nowrap w-full justify-start md:justify-center">
          <TabsTrigger value="overview" className="rounded-xl px-4 font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white whitespace-nowrap">نظرة عامة</TabsTrigger>
          <TabsTrigger value="orders" className="rounded-xl px-4 font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white whitespace-nowrap">الطلبات</TabsTrigger>
          <TabsTrigger value="staff" className="rounded-xl px-4 font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white whitespace-nowrap">الموظفين</TabsTrigger>
          <TabsTrigger value="stock" className="rounded-xl px-4 font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white whitespace-nowrap">المخزون</TabsTrigger>
          <TabsTrigger value="butcher_logs" className="rounded-xl px-4 font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white whitespace-nowrap">سجل الجزار</TabsTrigger>
          <TabsTrigger value="insights" className="rounded-xl px-4 font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white whitespace-nowrap">تحليلات</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="overview">
        <div className="grid md:grid-cols-4 gap-6">
          <Card className="p-8 rounded-[2rem] bg-indigo-600 text-white shadow-xl">
            <p className="font-bold opacity-80">طلبات اليوم</p>
            <p className="text-4xl font-black mt-2">{orders.length}</p>
          </Card>
          <Card className="p-8 rounded-[2rem] bg-emerald-600 text-white shadow-xl">
            <p className="font-bold opacity-80">صافي الدخل</p>
            <p className="text-4xl font-black mt-2">{orders.reduce((a, b) => a + (b.total || 0), 0)} ﷼</p>
          </Card>
          <Card className="p-8 rounded-[2rem] bg-white shadow-xl">
            <p className="font-bold text-muted-foreground">قيد التجهيز</p>
            <p className="text-4xl font-black mt-2 text-indigo-600">{activeOrders.length}</p>
          </Card>
          <Card className="p-8 rounded-[2rem] bg-white shadow-xl">
            <p className="font-bold text-muted-foreground">نسبة الرضا</p>
            <p className="text-4xl font-black mt-2 text-emerald-600">98%</p>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="orders">
        <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
          <div className="p-8 border-b flex justify-between items-center bg-slate-50">
            <div>
              <h3 className="text-2xl font-black">التحكم المباشر وتوزيع المهام</h3>
              <p className="text-muted-foreground font-bold text-sm">قم بتعيين الجزارين والسائقين لكل طلب</p>
            </div>
            <div className="flex gap-4">
              <Button onClick={autoProcess} className="bg-indigo-600 rounded-2xl h-14 px-8 font-black gap-2 shadow-xl hover:bg-indigo-700 transition-all">
                <Activity className="h-5 w-5" />
                المعالجة التلقائية الذكية
              </Button>
            </div>
          </div>
          <ScrollArea className="h-[60vh]">
            <div className="p-8 space-y-6">
              {activeOrders.map(order => (
                <div key={order.id} className="p-8 bg-slate-50 border border-slate-100 rounded-[2rem] space-y-6 relative overflow-hidden group hover:bg-white hover:shadow-2xl hover:border-indigo-100 transition-all">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                      <div className="h-20 w-20 rounded-3xl bg-white flex flex-col items-center justify-center font-black shadow-lg border-2 border-indigo-50">
                        <span className="text-xs text-indigo-400 font-bold uppercase">الطلب</span>
                        <span className="text-2xl">#{order.id.toString().slice(-3)}</span>
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-slate-900">{order.customer_name || 'عميل'}</h4>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground font-bold">
                          <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {new Date(order.created_at).toLocaleTimeString('ar-SA')}</span>
                          <span className="h-4 w-[1px] bg-slate-300" />
                          <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {order.address}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4">
                      {/* Butcher Assignment */}
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 mr-2">الجزار المسؤول</label>
                        <Select
                          value={order.butcher_staff_id?.toString()}
                          onValueChange={(val) => updateAssignmentMutation.mutate({ id: order.id, butcherId: parseInt(val), status: 'preparing' })}
                        >
                          <SelectTrigger className="w-[180px] h-12 rounded-xl border-2 font-bold bg-white">
                            <SelectValue placeholder="اختر جزار..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-2">
                            {butchers.map(st => (
                              <SelectItem key={st.id} value={st.id.toString()} className="font-bold">{st.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Driver Assignment */}
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 mr-2">مندوب التوصيل</label>
                        <Select
                          value={order.driver_staff_id?.toString()}
                          onValueChange={(val) => updateAssignmentMutation.mutate({ id: order.id, driverId: parseInt(val) })}
                        >
                          <SelectTrigger className="w-[180px] h-12 rounded-xl border-2 font-bold bg-white">
                            <SelectValue placeholder="اختر مندوب..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-2">
                            {drivers.map(st => (
                              <SelectItem key={st.id} value={st.id.toString()} className="font-bold">{st.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-2 pt-6">
                        <Badge className={`h-12 px-6 rounded-xl font-black text-sm border-none shadow-sm ${order.status === 'pending' ? 'bg-orange-100 text-orange-600' :
                          order.status === 'preparing' ? 'bg-indigo-100 text-indigo-600' :
                            order.status === 'ready' ? 'bg-emerald-100 text-emerald-600' :
                              'bg-slate-100 text-slate-600'
                          }`}>
                          {order.status === 'pending' ? 'بانتظار الموافقة' :
                            order.status === 'preparing' ? 'قيد التجهيز' :
                              order.status === 'ready' ? 'جاهز للتوصيل' : 'حالة أخرى'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      </TabsContent>

      <TabsContent value="staff">
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="rounded-[2.5rem] p-8 border-none shadow-xl bg-white">
            <h3 className="text-2xl font-black mb-6">حالة الكادر الحالي</h3>
            <div className="space-y-6">
              {[
                { role: 'الجزارين', count: '4/4', status: 'نشط', color: 'bg-emerald-500' },
                { role: 'المناديب', count: '12/15', status: 'متاح 3', color: 'bg-blue-500' },
                { role: 'خدمة العملاء', count: '2/2', status: 'نشط', color: 'bg-emerald-500' }
              ].map(item => (
                <div key={item.role} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${item.color}`} />
                    <span className="font-bold">{item.role}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-black">{item.count}</span>
                    <Badge variant="outline" className="font-bold">{item.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="rounded-[2.5rem] p-8 border-none shadow-xl bg-indigo-50 flex flex-col items-center justify-center text-center">
            <Users className="h-16 w-16 mb-4 text-indigo-600" />
            <h4 className="text-xl font-black">توزيع المناوبات</h4>
            <p className="text-muted-foreground mt-2 mb-6 text-sm">تخطيط ساعات العمل وتوزيع المهام الأسبوعية</p>
            <Button className="w-full h-14 bg-indigo-600 rounded-2xl font-black">إدارة الجدول الزمني</Button>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="stock">
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="rounded-[2.5rem] border-none shadow-xl p-8 bg-white">
            <h3 className="text-2xl font-black mb-6">المخزون المتوقع</h3>
            <p className="text-muted-foreground mb-8 font-bold text-sm italic">بناءً على طلبات اليوم والأسبوع الماضي، ستحتاج إلى:</p>
            <div className="space-y-4">
              <div className="p-6 bg-rose-50 rounded-3xl border border-rose-100 flex justify-between items-center text-rose-900">
                <span className="font-black text-lg">نعيمي (حجم وسط)</span>
                <span className="font-black text-2xl">10 راس</span>
              </div>
              <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 flex justify-between items-center text-blue-900">
                <span className="font-black text-lg">حري (حجم كبير)</span>
                <span className="font-black text-2xl">4 راس</span>
              </div>
            </div>
          </Card>
          <Card className="rounded-[2.5rem] border-none shadow-xl p-8 bg-slate-900 text-white">
            <h3 className="text-2xl font-black mb-6">طلب توريد سريع</h3>
            <p className="text-slate-400 mb-6">إرسال قائمة النواقص لأصحاب المزارع المعتمدين</p>
            <Button className="w-full h-16 bg-white text-slate-900 rounded-2xl text-xl font-black">طلب كميات إضافية</Button>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="insights">
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-8 rounded-3xl text-center shadow-xl border-none">
            <div className="h-16 w-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4"><BarChart3 className="h-8 w-8" /></div>
            <h4 className="font-black text-lg">المنتج الأكثر طلباً</h4>
            <p className="text-indigo-600 font-black text-2xl mt-2 italic underline underline-offset-8">نعيمي لباني</p>
          </Card>
          <Card className="p-8 rounded-3xl text-center shadow-xl border-none">
            <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="h-8 w-8" /></div>
            <h4 className="font-black text-lg">سرعة التنفيذ</h4>
            <p className="text-emerald-600 font-black text-2xl mt-2">15 دقيقة / طلب</p>
          </Card>
          <Card className="p-8 rounded-3xl text-center shadow-xl border-none">
            <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4"><Users className="h-8 w-8" /></div>
            <h4 className="font-black text-lg">العودة للشراء</h4>
            <p className="text-blue-600 font-black text-2xl mt-2">72% من العملاء</p>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="butcher_logs">
        <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
          <div className="p-8 border-b bg-slate-50">
            <h3 className="text-2xl font-black">سجل تحديثات الجزارين</h3>
            <p className="text-sm text-muted-foreground font-bold">تتبع جميع التعديلات على الكميات والأسعار اليومية</p>
          </div>
          <ScrollArea className="h-[60vh]">
            <div className="p-8">
              <ButcherAuditLogs />
            </div>
          </ScrollArea>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

// 4. Accountant / Financial Portal
export function AccountantPortal() {
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').order('name');
      if (error) throw error;
      return data as Product[];
    }
  });

  const { data: orders = [] } = useQuery<any[]>({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*), staff:driver_staff_id(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const { data: financialRecords = [] } = useQuery<any[]>({
    queryKey: ["financial_records"],
    queryFn: async () => {
      const { data, error } = await supabase.from('financial_records').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const { data: staffMembers = [] } = useQuery<any[]>({
    queryKey: ["staff"],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff').select('*');
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 10000 // Poll every 10 seconds for staff updates
  });

  const { data: deliveryZones = [] } = useQuery<any[]>({
    queryKey: ["delivery_zones"],
    queryFn: async () => {
      const { data, error } = await supabase.from('delivery_zones').select('*');
      if (error) throw error;
      return data || [];
    }
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pricingSearch, setPricingSearch] = useState("");

  const updatePriceMutation = useMutation({
    mutationFn: async ({ id, price }: { id: number, price: number }) => {
      const { error } = await supabase.from('products').update({ price }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "تم تحديث السعر بنجاح" });
    }
  });

  const addExpenseMutation = useMutation({
    mutationFn: async (expense: any) => {
      const { error } = await supabase.from('financial_records').insert([expense]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial_records"] });
      toast({ title: "تم إضافة المصروف بنجاح" });
    }
  });

  // --- Real Data Calculations ---
  const today = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter(o => o.created_at?.startsWith(today));
  const dailyIncome = todayOrders.reduce((acc, o) => acc + (o.total || 0), 0);

  const totalRevenue = orders.reduce((acc, o) => acc + (o.total || 0), 0);
  const totalExpenses = financialRecords.reduce((acc, r) => acc + (r.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;

  // --- Detailed Payroll & Performance Calculation ---
  const staffPayrollStats = useMemo(() => {
    return staffMembers.map(staff => {
      const settings = typeof staff.role_settings === 'string' ? JSON.parse(staff.role_settings) : staff.role_settings || {};
      const baseSalary = parseFloat(settings.baseSalary) || 0;

      // Calculate earnings for drivers
      let commissions = 0;
      const staffOrders = orders.filter(o => o.driver_staff_id === staff.id);

      const ordersWithCommission = staffOrders.map(order => {
        const zone = deliveryZones.find(z => z.id === order.zone_id);
        // User requested: driver commission = delivery fee from the map zones
        const commission = zone?.fee || zone?.driver_commission || 0;
        commissions += commission;
        return { ...order, zone_name: zone?.name || 'غير محدد', commission, delivery_fee: zone?.fee || 0 };
      });

      const totalEarnings = baseSalary + commissions + (staff.wallet_balance || 0); // wallet_balance can be bonuses/adjustments

      return {
        ...staff,
        baseSalary,
        commissions,
        totalEarnings,
        orders: ordersWithCommission,
        completedCount: ordersWithCommission.filter(o => o.status === 'completed').length
      };
    }).sort((a, b) => b.totalEarnings - a.totalEarnings);
  }, [staffMembers, orders, deliveryZones]);

  // Aggregate Stats for Cards
  const totalStaffCount = staffMembers.length;
  const totalPayrollBudget = staffPayrollStats.reduce((acc, s) => acc + s.totalEarnings, 0);
  const totalCommissions = staffPayrollStats.reduce((acc, s) => acc + s.commissions, 0);

  // Forecast Logic (Simple linear or based on last 7 days)
  const last7DaysOrders = orders.filter(o => {
    const d = new Date(o.created_at);
    const now = new Date();
    return (now.getTime() - d.getTime()) < (7 * 24 * 60 * 60 * 1000);
  });
  const avgDailyRevenue = last7DaysOrders.length > 0
    ? last7DaysOrders.reduce((acc, o) => acc + (o.total || 0), 0) / 7
    : 0;
  const forecastNextWeek = avgDailyRevenue * 7;

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(pricingSearch.toLowerCase())
  );

  // Dynamic Chart Data for the last 7 days
  const revenueData = useMemo(() => {
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = days[d.getDay()];
      const dayTotal = orders
        .filter(o => o.created_at?.startsWith(dateStr))
        .reduce((acc, o) => acc + (o.total || 0), 0);
      last7Days.push({ name: dayName, value: dayTotal });
    }
    return last7Days;
  }, [orders]);

  const exportToExcel = () => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + "ID,Customer,Amount,Status,Date\n"
      + orders.map(o => `${o.id},${o.customer_name},${o.total},${o.status},${o.created_at}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `financial_report_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    toast({ title: "تم التصدير بنجاح", description: "تم تحميل ملف CSV" });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Tabs defaultValue="overview" className="space-y-6 relative">
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative">
          <h2 className="text-4xl font-black font-heading text-slate-900 flex items-center gap-3">
            <div className="h-12 w-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-200">
              <DollarSign className="h-7 w-7" />
            </div>
            مركز الإدارة المالية
          </h2>
          <p className="text-muted-foreground mr-14 font-bold">الرقابة الكاملة على التدفق النقدي والأرباح</p>
        </div>

        {/* Desktop Tabs List */}
        <TabsList className="hidden md:flex bg-slate-100/80 p-1.5 h-14 rounded-[1.25rem] border-2 border-slate-200 transition-all">
          <TabsTrigger value="overview" className="rounded-xl px-6 font-bold data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-md">الرئيسية</TabsTrigger>
          <TabsTrigger value="pricing" className="rounded-xl px-6 font-bold data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-md">الأسعار</TabsTrigger>
          <TabsTrigger value="finances" className="rounded-xl px-6 font-bold data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-md">التقارير والمصاريف</TabsTrigger>
          <TabsTrigger value="salaries" className="rounded-xl px-6 font-bold data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-md">الرواتب والتوظيف</TabsTrigger>
        </TabsList>
      </div>

      {/* Overview Tab Content */}
      <TabsContent value="overview" className="space-y-8 animate-in fade-in duration-500">
        {/* Statistics Cards */}
        <div className="grid md:grid-cols-4 gap-6">
          <Card className="p-8 rounded-[2.5rem] bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
              <TrendingUp className="h-32 w-32" />
            </div>
            <p className="font-bold opacity-80 text-lg">دخل اليوم المباشر</p>
            <p className="text-5xl font-black mt-4">{dailyIncome.toLocaleString()} ﷼</p>
            <div className="mt-6 flex items-center gap-2 bg-white/20 w-fit px-4 py-1.5 rounded-full backdrop-blur-sm text-sm font-bold">
              <Activity className="h-4 w-4" />
              {todayOrders.length} طلبات اليوم
            </div>
          </Card>

          <Card className="p-8 rounded-[2.5rem] bg-white border-none shadow-xl flex flex-col justify-between">
            <div>
              <p className="font-bold text-slate-500">إجمالي المبيعات (الشهر)</p>
              <p className="text-4xl font-black mt-2 text-slate-900">{totalRevenue.toLocaleString()} ﷼</p>
            </div>
            <div className="flex items-center gap-2 text-emerald-600 font-bold mt-4">
              <Plus className="h-4 w-4" />
              <span>12.5% عن الشهر الماضي</span>
            </div>
          </Card>

          <Card className="p-8 rounded-[2.5rem] bg-white border-none shadow-xl">
            <p className="font-bold text-slate-500">إجمالي الأرباح الصافية</p>
            <p className={`text-4xl font-black mt-2 ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {netProfit.toLocaleString()} ﷼
            </p>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-6">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, (netProfit / totalRevenue) * 100)}%` }} />
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 font-bold">نسبة الهامش: {totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}%</p>
          </Card>

          <Card className="p-8 rounded-[2.5rem] bg-slate-900 text-white shadow-xl border-none">
            <p className="font-bold opacity-80">توقعات مبيعات الأسبوع القادم</p>
            <p className="text-4xl font-black mt-2 text-amber-400">~{forecastNextWeek.toLocaleString()} ﷼</p>
            <p className="text-[10px] text-amber-500/80 mt-2 font-bold flex items-center gap-1 italic">
              <Activity className="h-3 w-3" /> تعتمد على أداء آخر 7 أيام
            </p>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Chart */}
          <Card className="md:col-span-2 rounded-[3rem] p-10 bg-white border-none shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-black">تحليل الإيرادات الأسبوعي</h3>
                <p className="text-muted-foreground font-bold">تتبع النمو اليومي للمبيعات</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="rounded-xl font-bold">7 أيام</Button>
                <Button variant="ghost" size="sm" className="rounded-xl font-bold">30 يوم</Button>
              </div>
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontWeight: 'bold' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontWeight: 'bold' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                    cursor={{ stroke: '#f59e0b', strokeWidth: 2 }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Quick Actions & Features */}
          <div className="space-y-6">
            <h3 className="text-xl font-black px-4">مميزات محاسبية ذكية</h3>

            <div onClick={handlePrint} className="p-6 bg-white rounded-[2rem] shadow-md border-2 border-transparent hover:border-amber-500 cursor-pointer transition-all group flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
                  <Printer className="h-7 w-7" />
                </div>
                <div>
                  <p className="font-black">طباعة التقرير اليومي</p>
                  <p className="text-xs text-muted-foreground font-bold">توليد ملف PDF جاهز للطباعة</p>
                </div>
              </div>
              <Activity className="h-5 w-5 text-slate-300" />
            </div>

            <div onClick={exportToExcel} className="p-6 bg-white rounded-[2rem] shadow-md border-2 border-transparent hover:border-emerald-500 cursor-pointer transition-all group flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  <FileText className="h-7 w-7" />
                </div>
                <div>
                  <p className="font-black">حاسبة العمولات للمناديب</p>
                  <p className="text-xs text-muted-foreground font-bold">احسب مستحقات السائقين بناءً على الطلبات</p>
                </div>
              </div>
              <Activity className="h-5 w-5 text-slate-300" />
            </div>

            <div className="p-6 bg-slate-900 rounded-[2rem] shadow-xl text-white relative overflow-hidden group">
              <div className="relative z-10">
                <h4 className="text-lg font-black mb-2">إضافة مصروف سريع</h4>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as any;
                  addExpenseMutation.mutate({
                    amount: parseFloat(form.amount.value),
                    description: form.desc.value,
                    category: 'other',
                    type: 'expense'
                  });
                  form.reset();
                }} className="space-y-2">
                  <input name="desc" placeholder="الوصف" className="bg-white/10 w-full rounded-xl px-4 py-2 outline-none font-bold text-sm" required />
                  <div className="flex gap-2">
                    <input name="amount" type="number" placeholder="المبلغ" className="bg-white/10 w-full rounded-xl px-4 py-2 outline-none font-bold text-sm" required />
                    <Button type="submit" className="bg-rose-500 hover:bg-rose-600 rounded-xl font-black text-xs">حفظ</Button>
                  </div>
                </form>
              </div>
              <DollarSign className="absolute -left-4 -bottom-4 h-24 w-24 opacity-10 rotate-12" />
            </div>

            <div className="p-8 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center group cursor-pointer hover:border-amber-400 hover:bg-amber-50/30 transition-all">
              <TrendingUp className="h-10 w-10 text-slate-300 group-hover:text-amber-500 mb-2" />
              <p className="font-black text-slate-400 group-hover:text-amber-900">تحليل الأداء الموسمي</p>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="pricing">
        <Card className="rounded-[3rem] border-none shadow-2xl bg-white overflow-hidden">
          <div className="p-10 border-b bg-amber-50 flex justify-between items-center">
            <div>
              <h3 className="text-3xl font-black text-amber-900">إدارة قائمة الأسعار</h3>
              <p className="text-amber-700/70 font-bold mt-1">تحديث أسعار السوق اليومية لجميع المنتجات</p>
            </div>
            <div className="flex gap-4">
              <div className="relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-400" />
                <input
                  placeholder="ابحث عن منتج..."
                  value={pricingSearch}
                  onChange={(e) => setPricingSearch(e.target.value)}
                  className="bg-white pr-12 pl-6 py-4 rounded-2xl outline-none focus:ring-2 ring-amber-500 shadow-sm font-bold w-64"
                />
              </div>
            </div>
          </div>
          <ScrollArea className="h-[65vh]">
            <div className="p-10 grid md:grid-cols-2 gap-6">
              {filteredProducts.map(product => (
                <div key={product.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-[2.5rem] border-2 border-transparent hover:border-amber-200 hover:bg-white transition-all shadow-sm group">
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <img src={product.image} className="h-24 w-24 rounded-[2rem] object-cover shadow-xl group-hover:scale-110 transition-transform" />
                      <div className="absolute -top-2 -right-2 h-7 w-7 bg-amber-500 text-white rounded-full flex items-center justify-center font-black text-xs shadow-lg">#</div>
                    </div>
                    <div>
                      <p className="font-black text-2xl text-slate-900">{product.name}</p>
                      <Badge variant="outline" className="mt-1 font-bold border-amber-200 text-amber-700">{product.unit}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="relative w-40">
                      <input
                        type="number"
                        step="0.1"
                        defaultValue={product.price}
                        onBlur={(e) => updatePriceMutation.mutate({ id: product.id, price: parseFloat(e.target.value) })}
                        className="w-full h-16 px-6 bg-white border-2 border-slate-200 rounded-2xl outline-none text-left font-black text-2xl text-amber-900 focus:border-amber-500 transition-colors shadow-inner"
                        dir="ltr"
                      />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-600 font-black">﷼</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      </TabsContent>

      <TabsContent value="finances" className="space-y-8">
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="md:col-span-2 rounded-[3.5rem] p-10 bg-white shadow-2xl space-y-8 border-none">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-3xl font-black text-slate-900">سجل المصاريف والعمليات</h3>
                <p className="text-muted-foreground font-bold italic">تتبع كل ريال وارد وصادر</p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-amber-500 hover:bg-amber-600 rounded-2xl h-14 px-8 font-black gap-2 shadow-xl shadow-amber-200">
                    <Plus className="h-5 w-5" /> إضافة عملية مالية
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-[2.5rem] p-10">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black">إضافة قيد مالي جديد</DialogTitle>
                    <DialogDescription className="font-bold text-slate-500">قم بتسجيل المصروفات أو الإيرادات بدقة</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-6">
                    <div className="space-y-2">
                      <label className="font-bold text-sm">نوع العملية</label>
                      <Select>
                        <SelectTrigger className="h-14 rounded-xl font-bold">
                          <SelectValue placeholder="اختر الفئة" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="exp" className="font-bold">مصاريف تشغيل</SelectItem>
                          <SelectItem value="fix" className="font-bold">مشتريات أصول</SelectItem>
                          <SelectItem value="tax" className="font-bold">رسوم وضرائب</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="font-bold text-sm">المبلغ</label>
                      <input type="number" className="w-full h-14 px-6 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none font-black text-xl" dir="ltr" />
                    </div>
                    <Button className="w-full h-16 bg-slate-900 text-white rounded-2xl text-xl font-black mt-4">حفظ العملية</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              {financialRecords.slice(0, 10).map((record, idx) => (
                <div key={record.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border-2 border-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-5">
                    <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${record.type === 'expense' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      {record.type === 'expense' ? <TrendingUp className="h-7 w-7 rotate-180" /> : <DollarSign className="h-7 w-7" />}
                    </div>
                    <div>
                      <p className="font-black text-xl text-slate-900">{record.description}</p>
                      <p className="text-xs text-muted-foreground font-bold">{new Date(record.created_at).toLocaleString('ar-SA')} | الفئة: {record.category}</p>
                    </div>
                  </div>
                  <p className={`text-2xl font-black ${record.type === 'expense' ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {record.type === 'expense' ? '-' : '+'}{record.amount.toLocaleString()} ﷼
                  </p>
                </div>
              ))}
              {financialRecords.length === 0 && (
                <p className="text-center py-10 text-muted-foreground font-bold">لا توجد سجلات مالية مسجلة حالياً</p>
              )}
            </div>
            <Button variant="ghost" className="w-full font-bold text-slate-400 hover:text-slate-900 h-14">عرض السجل التاريخي الكامل</Button>
          </Card>

          <div className="space-y-8">
            <Card className="p-10 rounded-[3rem] bg-indigo-600 text-white shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
              <PieChart width={200} height={200}>
                <Pie
                  data={[
                    { name: 'إيرادات', value: totalRevenue },
                    { name: 'مصاريف', value: totalExpenses },
                  ]}
                  cx="50%" cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#fbbf24" />
                  <Cell fill="rgba(255,255,255,0.2)" />
                </Pie>
              </PieChart>
              <h4 className="text-2xl font-black mt-6">تحليل صافي الربح</h4>
              <p className="text-4xl font-black mt-2 text-amber-400">
                {totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(0) : 0}%
              </p>
              <p className="mt-4 opacity-70 font-bold">بناءً على جميع البيانات المسجلة</p>
            </Card>

            <div className="space-y-4">
              <h4 className="text-xl font-black px-4">تقارير جاهزة للتصدير</h4>
              {[
                { title: 'القوائم المالية السنوية', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
                { title: 'تقرير مبيعات المندوبين', icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { title: 'جرد المخزون الفعلي', icon: Package, color: 'text-amber-600', bg: 'bg-amber-50' },
              ].map((r, i) => (
                <div key={i} className={`p-6 rounded-[2rem] ${r.bg} flex items-center justify-between group cursor-pointer hover:shadow-lg transition-all`}>
                  <div className="flex items-center gap-4">
                    <r.icon className={`h-7 w-7 ${r.color}`} />
                    <span className="font-black text-slate-800">{r.title}</span>
                  </div>
                  <Printer className="h-5 w-5 text-slate-300 group-hover:text-slate-900 transition-colors" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="salaries" className="space-y-8">
        <div className="grid md:grid-cols-4 gap-6">
          <Card className="p-8 rounded-[2.5rem] bg-white border-none shadow-xl text-center">
            <Users className="h-10 w-10 text-indigo-600 mx-auto mb-4" />
            <p className="text-slate-500 font-bold">إجمالي الكادر</p>
            <p className="text-4xl font-black text-slate-900 mt-2">{totalStaffCount} موظف</p>
          </Card>
          <Card className="p-8 rounded-[2.5rem] bg-indigo-600 text-white border-none shadow-xl text-center">
            <DollarSign className="h-10 w-10 text-white mx-auto mb-4" />
            <p className="opacity-80 font-bold">الميزانية التقديرية (شهري)</p>
            <p className="text-4xl font-black text-amber-400 mt-2">{totalPayrollBudget.toLocaleString()} ﷼</p>
          </Card>
          <Card className="p-8 rounded-[2.5rem] bg-white border-none shadow-xl text-center">
            <Gift className="h-10 w-10 text-emerald-600 mx-auto mb-4" />
            <p className="text-slate-500 font-bold">إجمالي عمولات المناديب</p>
            <p className="text-4xl font-black text-emerald-600 mt-2">{totalCommissions.toLocaleString()} ﷼</p>
          </Card>
          <Card className="p-8 rounded-[2.5rem] bg-rose-50 border-none shadow-sm text-center">
            <Activity className="h-10 w-10 text-rose-600 mx-auto mb-4" />
            <p className="text-rose-900 font-bold">الإضافات / التعديلات</p>
            <p className="text-4xl font-black text-rose-600 mt-2">
              {staffPayrollStats.reduce((acc, s) => acc + (s.wallet_balance || 0), 0).toLocaleString()} ﷼
            </p>
          </Card>
        </div>

        <Card className="rounded-[3.5rem] p-10 bg-white border-none shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
            <div>
              <h3 className="text-3xl font-black text-slate-900">إدارة المكافآت والرواتب</h3>
              <p className="text-muted-foreground font-bold">كشوفات شهر فبراير 2024</p>
            </div>
            <div className="flex gap-4">
              <Button className="bg-slate-900 text-white rounded-2xl h-14 px-8 font-black shadow-xl">إغلاق الدورة المالية</Button>
              <Button className="bg-emerald-600 text-white rounded-2xl h-14 px-8 font-black shadow-xl">صرف الرواتب الجماعي</Button>
            </div>
          </div>

          <div className="space-y-4">
            {staffPayrollStats.map((person, i) => (
              <div key={i} className="flex flex-col md:flex-row items-center justify-between p-8 bg-slate-50 rounded-[2.5rem] border-2 border-white hover:bg-white hover:shadow-xl transition-all gap-8">
                <div className="flex items-center gap-6 w-full md:w-auto">
                  <div className="h-20 w-20 rounded-[1.75rem] bg-indigo-100 flex items-center justify-center text-3xl font-black text-indigo-700 shadow-inner">
                    {person.name[0]}
                  </div>
                  <div>
                    <p className="font-black text-2xl text-slate-900">{person.name}</p>
                    <p className="text-slate-500 font-bold">
                      {person.role === 'delivery' ? 'مندوب توصيل' :
                        person.role === 'butcher' ? 'جزار فني' : person.role} |
                      {person.orders.length} عمليات
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 flex-1 w-full text-center">
                  <div>
                    <p className="text-xs text-muted-foreground font-bold mb-1 uppercase tracking-wider">الراتب الأساسي</p>
                    <p className="text-xl font-black text-slate-900">{person.baseSalary.toLocaleString()} ﷼</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-bold mb-1 uppercase tracking-wider">العمولات المستحقة</p>
                    <p className="text-xl font-black text-emerald-600">+{person.commissions.toLocaleString()} ﷼</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-bold mb-1 uppercase tracking-wider">تعديلات المحفظة</p>
                    <p className={`text-xl font-black ${person.wallet_balance >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                      {person.wallet_balance >= 0 ? '+' : ''}{person.wallet_balance?.toLocaleString()} ﷼
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-bold mb-1 uppercase tracking-wider italic">صافي المستحق</p>
                    <p className="text-2xl font-black bg-slate-900 text-white px-6 py-2 rounded-2xl w-fit mx-auto shadow-lg">
                      {person.totalEarnings.toLocaleString()} ﷼
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="h-14 px-6 rounded-2xl font-black border-2 hover:bg-slate-50">عرض كشف التفاصيل</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl rounded-[2.5rem] bg-white p-8 overflow-hidden h-[85vh] flex flex-col">
                      <div className="flex justify-between items-center mb-8">
                        <div>
                          <h3 className="text-3xl font-black">كشف مستحقات: {person.name}</h3>
                          <p className="text-slate-500 font-bold">الدور: {person.role} | ملخص الأداء والعمولات</p>
                        </div>
                        <Button onClick={() => window.print()} variant="outline" className="rounded-xl gap-2 font-bold h-12">
                          <Printer className="h-5 w-5" /> طباعة الكشف
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="p-6 bg-slate-50 rounded-2xl border-2 border-white text-center">
                          <p className="text-xs font-bold text-slate-400 mb-1">إجمالي العمليات</p>
                          <p className="text-2xl font-black">{person.orders.length}</p>
                        </div>
                        <div className="p-6 bg-emerald-50 rounded-2xl border-2 border-white text-center">
                          <p className="text-xs font-bold text-emerald-600/70 mb-1">الربح من العمولات</p>
                          <p className="text-2xl font-black text-emerald-600">{person.commissions} ﷼</p>
                        </div>
                        <div className="p-6 bg-indigo-50 rounded-2xl border-2 border-white text-center">
                          <p className="text-xs font-bold text-indigo-600/70 mb-1">نسبة الإنجاز</p>
                          <p className="text-2xl font-black text-indigo-600">
                            {person.orders.length > 0 ? ((person.completedCount / person.orders.length) * 100).toFixed(0) : 0}%
                          </p>
                        </div>
                      </div>

                      <h4 className="font-black text-xl mb-4 pr-4 border-r-4 border-amber-500">تفاصيل الطلبات والعمولة</h4>
                      <ScrollArea className="flex-1 rounded-2xl border-2 border-slate-100 p-4">
                        <div className="space-y-3">
                          {person.orders.length > 0 ? (
                            person.orders.map((o: any) => (
                              <div key={o.id} className="p-5 bg-white rounded-2xl border border-slate-100 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-4">
                                  <div className="h-12 w-12 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-500">#{o.id}</div>
                                  <div>
                                    <p className="font-black text-lg">{o.address || 'عنوان غير محدد'}</p>
                                    <p className="text-xs text-slate-400 font-bold">المنطقة: {o.zone_name}</p>
                                  </div>
                                </div>
                                <div className="text-left">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-slate-400">قيمة الطلب:</span>
                                    <span className="font-black">{o.total} ﷼</span>
                                  </div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-slate-400">رسوم التوصيل (المنطقة):</span>
                                    <span className="font-bold text-slate-600">{o.delivery_fee} ﷼</span>
                                  </div>
                                  <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg">
                                    <span className="text-[10px] font-bold uppercase">العمولة (المستحقة للسائق):</span>
                                    <span className="font-black">+{o.commission} ﷼</span>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-center py-10 text-slate-400 font-bold">لا يوجد عمليات مسجلة لهذا الموظف</p>
                          )}
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                  <Button size="icon" onClick={() => window.print()} variant="outline" className="h-14 w-14 rounded-2xl border-2 text-slate-400 hover:text-slate-900 transition-colors">
                    <Printer className="h-6 w-6" />
                  </Button>
                </div>
              </div>
            ))}
            {staffPayrollStats.length === 0 && (
              <p className="text-center py-20 text-muted-foreground font-bold bg-slate-50 rounded-[2.5rem]">لا يوجد بيانات لموظفين مسجلة حالياً</p>
            )}
          </div>
        </Card>
      </TabsContent>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t-2 border-slate-100 p-3 pt-4 pb-8 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)]">
        <TabsList className="bg-transparent w-full grid grid-cols-4 gap-2 h-auto">
          <TabsTrigger value="overview" className="flex flex-col items-center gap-1.5 h-auto py-2 rounded-2xl data-[state=active]:bg-amber-500 data-[state=active]:text-white transition-all">
            <LayoutDashboard className="h-6 w-6" />
            <span className="text-[10px] font-black">الرئيسية</span>
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex flex-col items-center gap-1.5 h-auto py-2 rounded-2xl data-[state=active]:bg-amber-500 data-[state=active]:text-white transition-all">
            <DollarSign className="h-6 w-6" />
            <span className="text-[10px] font-black">الأسعار</span>
          </TabsTrigger>
          <TabsTrigger value="finances" className="flex flex-col items-center gap-1.5 h-auto py-2 rounded-2xl data-[state=active]:bg-amber-500 data-[state=active]:text-white transition-all">
            <FileText className="h-6 w-6" />
            <span className="text-[10px] font-black">التقارير</span>
          </TabsTrigger>
          <TabsTrigger value="salaries" className="flex flex-col items-center gap-1.5 h-auto py-2 rounded-2xl data-[state=active]:bg-amber-500 data-[state=active]:text-white transition-all">
            <Users className="h-6 w-6" />
            <span className="text-[10px] font-black">الموظفين</span>
          </TabsTrigger>
        </TabsList>
      </div>
    </Tabs>
  );
}

// 5. Customer Support / Complaints Portal
export function SupportPortal({ orders }: { orders: any[] }) {
  const [ticketSearch, setTicketSearch] = useState("");

  return (
    <Tabs defaultValue="tickets" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold font-heading text-primary">مركز خدمة العملاء</h2>
          <p className="text-muted-foreground mt-1">حل المشكلات، تتبع الطلبات، والتواصل المباشر</p>
        </div>
        <TabsList className="bg-blue-500/5 p-1 h-12 rounded-2xl border border-blue-500/10 overflow-x-auto scrollbar-hide flex-nowrap w-full justify-start md:justify-center">
          <TabsTrigger value="tickets" className="rounded-xl px-4 font-bold data-[state=active]:bg-blue-600 data-[state=active]:text-white whitespace-nowrap">تذاكر الدعم (2)</TabsTrigger>
          <TabsTrigger value="tracking" className="rounded-xl px-4 font-bold data-[state=active]:bg-blue-600 data-[state=active]:text-white whitespace-nowrap">تتبع طلب</TabsTrigger>
          <TabsTrigger value="whatsapp" className="rounded-xl px-4 font-bold data-[state=active]:bg-blue-600 data-[state=active]:text-white whitespace-nowrap">واتساب</TabsTrigger>
          <TabsTrigger value="returns" className="rounded-xl px-4 font-bold data-[state=active]:bg-blue-600 data-[state=active]:text-white whitespace-nowrap">المرتجع</TabsTrigger>
          <TabsTrigger value="faq" className="rounded-xl px-4 font-bold data-[state=active]:bg-blue-600 data-[state=active]:text-white whitespace-nowrap">الأسئلة</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="tickets">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2].map(i => (
            <Card key={i} className="rounded-[2.5rem] border-none shadow-xl overflow-hidden group">
              <div className={`h-2 ${i === 1 ? 'bg-rose-500' : 'bg-orange-500'}`} />
              <CardContent className="p-8 space-y-4">
                <div className="flex justify-between items-start">
                  <Badge className={`${i === 1 ? 'bg-rose-100 text-rose-700' : 'bg-orange-100 text-orange-700'} border-none rounded-full`}>
                    {i === 1 ? 'عاجل جداً' : 'متوسط'}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-bold">منذ 15 دقيقة</span>
                </div>
                <h3 className="text-xl font-black">تأخر وصول الطلب #4502</h3>
                <p className="text-muted-foreground text-sm font-bold line-clamp-2">العميل يتصل ويشكو من أن المندوب لم يتواصل معه منذ ساعة واللحم قد يفسد...</p>
                <div className="pt-4 flex gap-2">
                  <Button className="flex-1 rounded-2xl bg-blue-600 font-bold">رد وتواصل</Button>
                  <Button variant="outline" className="rounded-2xl font-bold">إغلاق</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          <Card className="rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center p-8 opacity-50 hover:opacity-100 transition-opacity cursor-pointer">
            <Plus className="h-10 w-10 mb-2 text-muted-foreground" />
            <p className="font-bold">فتح تذكرة يدوية</p>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="tracking" className="space-y-8">
        <Card className="rounded-[3rem] p-10 bg-white shadow-2xl border-none max-w-4xl mx-auto">
          <div className="flex gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="أدخل رقم الطلب أو جوال العميل..."
                className="w-full h-16 pr-12 pl-6 bg-muted/30 rounded-2xl outline-none focus:ring-2 ring-blue-500 font-bold"
              />
            </div>
            <Button className="h-16 px-10 rounded-2xl bg-blue-600 font-black text-lg">بحث سريع</Button>
          </div>
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <p className="font-bold">أدخل البيانات أعلاه لتتبع مسار الطلب وحالته الحالية</p>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="whatsapp">
        <div className="max-w-md mx-auto py-10">
          <Card className="rounded-[3rem] p-10 bg-[#25D366] text-white text-center shadow-2xl shadow-green-200">
            <div className="bg-white/20 p-6 rounded-full w-fit mx-auto mb-6">
              <PhoneCall className="h-12 w-12" />
            </div>
            <h3 className="text-3xl font-black mb-4">خدمة واتساب مباشر</h3>
            <p className="font-bold opacity-90 mb-8">الربط المباشر مع واجهة واتساب ويب للرد السريع على استفسارات العملاء</p>
            <Button className="w-full h-16 bg-white text-[#25D366] hover:bg-white/90 rounded-2xl text-xl font-black border-none">
              فتح المحادثات النشطة
            </Button>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="returns">
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="rounded-[2.5rem] p-8 border-none shadow-xl">
            <h3 className="text-2xl font-black mb-6">طلب مرتجع جديد</h3>
            <div className="space-y-4">
              <input placeholder="رقم الطلب" className="w-full p-4 bg-muted/50 rounded-2xl outline-none" />
              <textarea placeholder="سبب الارتجاع..." className="w-full p-4 bg-muted/50 rounded-2xl outline-none h-32" />
              <Button className="w-full h-14 bg-rose-600 rounded-2xl font-black">فتح طلب استرداد</Button>
            </div>
          </Card>
          <div className="space-y-4">
            <h4 className="font-bold text-xl px-4">آخر المرتجعات</h4>
            {[1, 2].map(i => (
              <div key={i} className="p-6 bg-white rounded-[2rem] shadow-sm border border-blue-50 flex justify-between items-center">
                <div>
                  <p className="font-black">طلب #390{i}</p>
                  <p className="text-xs text-muted-foreground">حالة الاسترداد: قيد المعالجة</p>
                </div>
                <Badge className="bg-orange-100 text-orange-700 border-none">بانتظار الموافقة</Badge>
              </div>
            ))}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="faq">
        <Card className="rounded-[2.5rem] p-8 shadow-xl border-none">
          <h3 className="text-2xl font-black mb-8">الأسئلة الشائعة والردود الجاهزة</h3>
          <div className="space-y-4">
            {[
              { q: 'متى يصل طلبي؟', a: 'يتم التوصيل خلال ساعتين كحد أقصى للطلبات المجهزة...' },
              { q: 'هل اللحم طازج؟', a: 'نعم، جميع الذبائح تذبح يومياً في مسالخ البلدية...' }
            ].map((faq, i) => (
              <div key={i} className="p-6 bg-blue-50/50 rounded-3xl space-y-2">
                <p className="font-black text-blue-900">س: {faq.q}</p>
                <p className="text-blue-800/70 font-bold">ج: {faq.a}</p>
              </div>
            ))}
          </div>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

// 6. Social Media / Designer Portal
export function DesignerPortal() {
  return (
    <Tabs defaultValue="tasks" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold font-heading text-primary">بوابة الإبداع والتسويق</h2>
          <p className="text-muted-foreground mt-1">إدارة البانرات، التصاميم، والحملات الإعلانية</p>
        </div>
        <TabsList className="bg-purple-500/5 p-1 h-12 rounded-2xl border border-purple-500/10 overflow-x-auto scrollbar-hide flex-nowrap w-full justify-start md:justify-center">
          <TabsTrigger value="tasks" className="rounded-xl px-4 font-bold data-[state=active]:bg-purple-600 data-[state=active]:text-white whitespace-nowrap">المهام</TabsTrigger>
          <TabsTrigger value="banners" className="rounded-xl px-4 font-bold data-[state=active]:bg-purple-600 data-[state=active]:text-white whitespace-nowrap">البانرات</TabsTrigger>
          <TabsTrigger value="offers" className="rounded-xl px-4 font-bold data-[state=active]:bg-purple-600 data-[state=active]:text-white whitespace-nowrap">العروض</TabsTrigger>
          <TabsTrigger value="social" className="rounded-xl px-4 font-bold data-[state=active]:bg-purple-600 data-[state=active]:text-white whitespace-nowrap">جدولة</TabsTrigger>
          <TabsTrigger value="branding" className="rounded-xl px-4 font-bold data-[state=active]:bg-purple-600 data-[state=active]:text-white whitespace-nowrap">الهوية</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="tasks">
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="rounded-[2.5rem] p-8 space-y-6 border-none shadow-xl">
            <h3 className="text-2xl font-black flex items-center gap-3">
              <PenTool className="h-6 w-6 text-purple-600" />
              لائحة المهام اليومية
            </h3>
            {[1, 2].map(i => (
              <div key={i} className="flex items-center justify-between p-6 bg-purple-50 rounded-3xl border-2 border-white shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center text-purple-600 shadow-sm">
                    {i === 1 ? <LayoutDashboard /> : <Activity />}
                  </div>
                  <div>
                    <p className="font-black">تصميم بانر "عرض الجمعة"</p>
                    <p className="text-xs text-muted-foreground font-bold">الحالة: قيد التنفيذ | المتطلبات: قياس 1080x1920</p>
                  </div>
                </div>
                <Button variant="ghost" className="rounded-xl font-bold">رفع ملف</Button>
              </div>
            ))}
          </Card>
          <Card className="rounded-[2.5rem] p-8 bg-gradient-to-br from-purple-700 to-indigo-800 text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-3xl font-black mb-4">رفع عرض جديد</h3>
              <p className="font-bold opacity-80 mb-8">يمكنك الآن إضافة منتج جديد لقسم العروض ورفع البانر الخاص به مباشرة</p>
              <Button className="w-full h-16 bg-white text-purple-700 hover:bg-white/90 rounded-2xl text-xl font-black shadow-lg">إدارة العروض المباشرة</Button>
            </div>
            <PenTool className="absolute -bottom-10 -left-10 h-48 w-48 opacity-10 rotate-12" />
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="banners">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="aspect-[9/16] bg-muted rounded-[2rem] border-4 border-white shadow-xl relative group overflow-hidden">
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center text-white">
                <p className="font-black mb-2">بانر القائمة الرئيسية</p>
                <Button size="sm" className="rounded-full bg-white text-black font-bold">تعديل</Button>
              </div>
              <div className="absolute top-4 right-4 h-8 w-8 bg-emerald-500 rounded-full border-2 border-white" />
            </div>
          ))}
          <div className="aspect-[9/16] rounded-[2rem] border-4 border-dashed border-purple-200 flex flex-col items-center justify-center text-purple-300 hover:text-purple-600 transition-colors cursor-pointer">
            <Plus className="h-12 w-12 mb-2" />
            <p className="font-black">إضافة جديد</p>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="social">
        <Card className="rounded-[2.5rem] p-8 border-none shadow-xl bg-white">
          <h3 className="text-2xl font-black mb-6">جدولة محتوى السوشيال ميديا</h3>
          <div className="space-y-4">
            {[
              { day: 'السبت', post: 'نشر صورة اللحم المشوي', platform: 'Instagram' },
              { day: 'الأحد', post: 'فيديو تقطيع الذبيحة', platform: 'TikTok' },
            ].map(plan => (
              <div key={plan.day} className="flex items-center justify-between p-6 bg-purple-50 rounded-3xl">
                <div className="flex items-center gap-4">
                  <div className="font-black text-purple-600 w-16 text-center">{plan.day}</div>
                  <div className="font-bold">{plan.post}</div>
                </div>
                <Badge className="bg-white text-purple-600 border border-purple-100">{plan.platform}</Badge>
              </div>
            ))}
            <Button className="w-full h-14 bg-purple-600 rounded-2xl font-black mt-4">إضافة لمنشورات الأسبوع</Button>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="branding">
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-8 rounded-3xl bg-slate-900 text-white text-center flex flex-col items-center justify-center">
            <div className="h-16 w-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4"><FileText className="h-8 w-8 text-purple-400" /></div>
            <h4 className="font-black">دليل الهوية</h4>
            <Button variant="link" className="text-purple-400 font-bold p-0">عرض الملف</Button>
          </Card>
          <Card className="p-8 rounded-3xl bg-white border-2 border-purple-50 text-center flex flex-col items-center justify-center">
            <div className="flex gap-2 mb-4">
              <div className="h-8 w-8 rounded-full bg-primary" />
              <div className="h-8 w-8 rounded-full bg-purple-600" />
            </div>
            <h4 className="font-black">لوحة الألوان</h4>
            <p className="text-xs text-muted-foreground mt-1">تحديث موسم الشتاء</p>
          </Card>
          <Card className="p-8 rounded-3xl bg-white border-2 border-dashed border-purple-100 flex flex-col items-center justify-center cursor-pointer">
            <Plus className="h-6 w-6 text-purple-300" />
            <p className="text-sm font-bold text-purple-300">أصل جديد</p>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}

// 7. General Manager Portal
export function GeneralManagerPortal({ orders }: { orders: any[] }) {
  return (
    <Tabs defaultValue="insights" className="space-y-6 text-right" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold font-heading text-primary">بوابة المدير العام</h2>
          <p className="text-muted-foreground mt-1">الرؤية الاستراتيجية والرقابة العليا على الأداء</p>
        </div>
        <TabsList className="bg-slate-500/5 p-1 h-12 rounded-2xl border border-slate-500/10 overflow-x-auto scrollbar-hide flex-nowrap w-full justify-start md:justify-center">
          <TabsTrigger value="insights" className="rounded-xl px-4 font-bold data-[state=active]:bg-slate-900 data-[state=active]:text-white whitespace-nowrap">الرؤى</TabsTrigger>
          <TabsTrigger value="staffing" className="rounded-xl px-4 font-bold data-[state=active]:bg-slate-900 data-[state=active]:text-white whitespace-nowrap">التوظيف</TabsTrigger>
          <TabsTrigger value="financials" className="rounded-xl px-4 font-bold data-[state=active]:bg-slate-900 data-[state=active]:text-white whitespace-nowrap">المالية</TabsTrigger>
          <TabsTrigger value="expansion" className="rounded-xl px-4 font-bold data-[state=active]:bg-slate-900 data-[state=active]:text-white whitespace-nowrap">التوسع</TabsTrigger>
          <TabsTrigger value="policies" className="rounded-xl px-4 font-bold data-[state=active]:bg-slate-900 data-[state=active]:text-white whitespace-nowrap">السياسات</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="insights">
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="p-8 rounded-[2.5rem] bg-slate-900 text-white shadow-2xl overflow-hidden relative border-none">
            <BarChart3 className="absolute -bottom-4 -left-4 h-32 w-32 opacity-10" />
            <h4 className="text-xl font-bold opacity-80">نمو المبيعات السنوي</h4>
            <p className="text-5xl font-black mt-4">+240%</p>
            <p className="mt-4 text-emerald-400 font-bold flex items-center gap-2">
              <Activity className="h-4 w-4" />
              أداء يتجاوز التوقعات
            </p>
          </Card>
          <Card className="p-8 rounded-[2.5rem] bg-white shadow-xl border-none">
            <h4 className="text-xl font-bold text-slate-500">القيمة السوقية التقديرية</h4>
            <p className="text-5xl font-black mt-4 text-slate-900">2.4M</p>
            <p className="mt-4 text-muted-foreground font-bold italic">بناءً على الأصول والتدفق النقدي</p>
          </Card>
          <Card className="p-8 rounded-[2.5rem] bg-white shadow-xl border-none">
            <h4 className="text-xl font-bold text-slate-500">معدل الاحتفاظ بالعملاء</h4>
            <p className="text-5xl font-black mt-4 text-emerald-600">85%</p>
            <p className="mt-4 text-emerald-500 font-bold">نمو مستدام</p>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="staffing">
        <Card className="rounded-[2.5rem] p-8 border-none shadow-xl bg-white space-y-8">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-black text-slate-900">هيكلية الكادر الوظيفي</h3>
            <Button className="bg-slate-900 rounded-full font-bold px-8">إضافة منصب جديد</Button>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { role: 'الإدارة العليا', count: 3, budget: 'High' },
              { role: 'الفنيين (جزارين)', count: 12, budget: 'Medium' },
              { role: 'العمليات اللوجستية', count: 25, budget: 'Medium' },
              { role: 'التسويق والإبداع', count: 5, budget: 'Dynamic' }
            ].map(dept => (
              <div key={dept.role} className="p-6 bg-slate-50 rounded-3xl flex justify-between items-center">
                <div>
                  <p className="font-black text-xl text-slate-900">{dept.role}</p>
                  <p className="text-slate-500 font-bold">{dept.count} موظف نشط</p>
                </div>
                <Badge className="bg-slate-200 text-slate-700 border-none font-bold">ميزانية {dept.budget}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="financials">
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="p-8 rounded-[2.5rem] border-none shadow-xl bg-white">
            <h3 className="text-2xl font-black mb-6 text-slate-900">ملخص التدفق النقدي</h3>
            <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-3xl text-slate-300 font-bold bg-slate-50/50">
              مخطط بياني للأرباح الشهرية
            </div>
          </Card>
          <Card className="p-8 rounded-[2.5rem] border-none shadow-xl bg-slate-50">
            <h3 className="text-2xl font-black mb-6 text-slate-900">توزيع التكاليف التشغيلية</h3>
            <div className="space-y-4">
              <div className="flex justify-between text-lg">
                <span className="font-bold">المواد الخام (ذبائح)</span>
                <span className="font-black">60%</span>
              </div>
              <div className="w-full h-3 bg-slate-200 rounded-full">
                <div className="w-[60%] h-full bg-slate-900 rounded-full" />
              </div>
              <div className="flex justify-between text-lg mt-4">
                <span className="font-bold">الرواتب والأجور</span>
                <span className="font-black">25%</span>
              </div>
              <div className="w-full h-3 bg-slate-200 rounded-full">
                <div className="w-[25%] h-full bg-slate-600 rounded-full" />
              </div>
            </div>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="expansion">
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="p-10 rounded-[3rem] bg-indigo-900 text-white shadow-2xl relative overflow-hidden border-none text-right" dir="rtl">
            <MapPin className="absolute -top-10 -right-10 h-48 w-48 opacity-10" />
            <h3 className="text-3xl font-black mb-4">الفروع الجديدة المخططة</h3>
            <p className="text-indigo-200 mb-8 font-bold">نظام الكاشتا يتوسع ليشمل مناطق جديدة بنهاية الربع الثاني</p>
            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl">
                <div className="h-3 w-3 bg-emerald-400 rounded-full" />
                <span className="font-bold text-lg">منطقة مكة المكرمة (قيد الإنشاء)</span>
              </div>
              <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl">
                <div className="h-3 w-3 bg-orange-400 rounded-full" />
                <span className="font-bold text-lg">منطقة الرياض (دراسة جدوى)</span>
              </div>
            </div>
          </Card>
          <Card className="p-10 rounded-[3rem] bg-white border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center shadow-lg">
            <Activity className="h-16 w-16 text-slate-300 mb-4" />
            <h3 className="text-2xl font-black mb-2 text-slate-400">تحليل الفرص الاستثمارية</h3>
            <p className="text-slate-400 max-w-xs mb-6 font-bold">قم بتحميل التقارير السوقية لتحليل الفرص المناسبة للتوسع</p>
            <Button variant="outline" className="rounded-2xl h-14 px-8 font-black border-2 border-slate-200 hover:bg-slate-50 transition-colors">رفع تقرير جدوى</Button>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="policies">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: 'كود السلوك الوظيفي', date: '2024/01', status: 'نشط' },
            { title: 'معايير الجودة والتعقيم', date: '2023/12', status: 'محدث' },
            { title: 'سياسة الخصوصية', date: '2023/11', status: 'نشط' }
          ].map(policy => (
            <Card key={policy.title} className="p-8 rounded-3xl space-y-4 shadow-sm border-2 border-slate-50 hover:border-slate-200 transition-all cursor-pointer bg-white">
              <FileText className="h-10 w-10 text-slate-400" />
              <h4 className="font-bold text-xl text-slate-900">{policy.title}</h4>
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-muted-foreground">{policy.date}</span>
                <Badge className="bg-emerald-100 text-emerald-700 border-none font-bold">{policy.status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      </TabsContent>
    </Tabs >
  );
}

export default function StaffDashboard({ forcedRole }: { forcedRole?: string }) {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: siteSettings = [] } = useQuery<any[]>({
    queryKey: ["site_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from('site_settings').select('*');
      if (error) throw error;
      return data || [];
    }
  });

  const settingsMap = useMemo(() => {
    return siteSettings.reduce((acc: any, curr: any) => {
      try {
        acc[curr.key] = typeof curr.value === 'string' ? JSON.parse(curr.value) : curr.value;
      } catch (e) {
        acc[curr.key] = curr.value;
      }
      return acc;
    }, {});
  }, [siteSettings]);

  const { data: zones = [] } = useQuery<any[]>({
    queryKey: ["delivery_zones"],
    queryFn: async () => {
      const { data, error } = await supabase.from('delivery_zones').select('*');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: orders = [] } = useQuery<(Order & { order_items: any[] })[]>({
    queryKey: ["orders", settingsMap.order_config?.delivery_fee_default],
    queryFn: async () => {
      console.log("🚀 Starting to fetch orders...");

      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('id', { ascending: false });

      if (error) {
        console.error("❌ Error fetching orders:", error);
        throw error;
      }

      console.log("✅ Orders fetched successfully:", data?.length);

      const defaultFee = settingsMap.order_config?.delivery_fee_default || 0;

      // Map to ensure consistent shape and add delivery fee fallback
      return (data || []).map(o => {
        let feeFromZone = 0;

        // Simple zone match if coordinates exist
        if (o.gps_lat && o.gps_lng && zones.length > 0) {
          const matchedZone = zones.find(z => {
            try {
              const poly = typeof z.coordinates === 'string' ? JSON.parse(z.coordinates) : z.coordinates;
              return isPointInPolygon([o.gps_lat, o.gps_lng], poly);
            } catch (e) { return false; }
          });
          if (matchedZone) feeFromZone = matchedZone.fee;
        }

        const finalDelivery = feeFromZone > 0 ? feeFromZone : defaultFee;

        return {
          ...o,
          deliveryFee: finalDelivery,
          // Normalize fields for frontend consistency
          customerName: o.customer_name,
          customerPhone: o.customer_phone
        };
      });
    },
    // Add retry to ensure it tries again if failed
    retry: 2,
    refetchInterval: 5000,
    enabled: !!siteSettings.length || !!zones.length,
  });

  // --- Real-time Sync Logic ---
  useEffect(() => {
    console.log('📡 [STAFF_REALTIME] Setting up listeners...');
    const channel = supabase
      .channel('staff-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
        },
        (payload) => {
          console.log('🔄 [STAFF_REALTIME] Change detected:', payload);
          queryClient.invalidateQueries();

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

  const { data: staffMembers = [] } = useQuery<any[]>({
    queryKey: ["staff"],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff').select('*');
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000, // Refresh staff list once a minute
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*');
      if (error) throw error;
      return data || [];
    },
  });

  const roleLabels: Record<string, string> = {
    manager: "مدير العمليات",
    butcher: "جزار / مجهز",
    delivery: "مندوب توصيل",
    accountant: "محاسب",
    support: "خدمة عملاء",
    designer: "مصمم",
    admin: "مدير عام"
  };

  const roleIcons: Record<string, any> = {
    manager: LayoutDashboard,
    butcher: Scissors,
    delivery: Truck,
    accountant: DollarSign,
    support: MessageSquare,
    designer: PenTool,
    admin: Settings
  };

  // Determine which role content to show
  // admin can see anything via forcedRole
  const effectiveRole = forcedRole || user?.role || "butcher";
  const Icon = roleIcons[effectiveRole] || Activity;

  const [isInvoiceChoiceOpen, setIsInvoiceChoiceOpen] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState<any>(null);

  const handlePrint = (order: any, type: 'a4' | 'receipt' | 'view' = 'a4') => {
    if (!order) return;

    if (type === 'view') {
      const html = getPremiumInvoiceHtml(order, 'a4');
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html.replace('window.print();', ''));
        win.document.close();
      }
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(getPremiumInvoiceHtml(order, type));
    printWindow.document.close();
  };

  const openInvoiceChoice = (order: any) => {
    setInvoiceOrder(order);
    setIsInvoiceChoiceOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] pb-24 text-right" dir="rtl">
      {/* Premium Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b sticky top-0 z-50 shadow-sm border-primary/10">
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="bg-primary/10 p-3 rounded-2xl border border-primary/20">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold font-heading text-primary">{roleLabels[effectiveRole] || "بوابة الموظف"}</h1>
              <p className="text-[10px] md:text-xs text-muted-foreground font-medium">مرحباً، {user?.username} | نظام كاشتا المتكامل</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {(user?.role === 'admin' || user?.role === 'manager') && (
              <Button onClick={() => window.location.href = '/admin'} variant="outline" className="rounded-2xl border-2 font-black h-12">لوحة الإدارة الكاملة</Button>
            )}
            <Button onClick={() => window.location.href = '/'} variant="ghost" className="rounded-2xl font-black h-12">المتجر</Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-5 duration-700">

          {(effectiveRole === 'admin' || effectiveRole === 'manager') && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-slate-900 pr-4 border-r-4 border-indigo-600">لوحة تحكم مدير العمليات</h2>
                <Button onClick={() => window.location.reload()} className="bg-white text-indigo-600 border-2 border-indigo-100 rounded-2xl hover:bg-slate-50 font-black h-12 px-8">تحديث البيانات</Button>
              </div>
              <ManagerPortal orders={orders} staffMembers={staffMembers} />
            </section>
          )}

          {(effectiveRole === 'admin' || effectiveRole === 'butcher') && (
            <section className="space-y-6">
              <h2 className="text-2xl font-black text-slate-900 pr-4 border-r-4 border-rose-600">محطة الجزارة الفنية</h2>
              <ButcherTerminal orders={orders} staffMembers={staffMembers} products={products} onPrintRequest={openInvoiceChoice} />
            </section>
          )}

          {(effectiveRole === 'admin' || effectiveRole === 'delivery') && (
            <section className="space-y-6">
              <h2 className="text-2xl font-black text-slate-900 pr-4 border-r-4 border-emerald-600">قطاع التوصيل والخدمات اللوجستية</h2>
              <DeliveryPortal orders={orders} staffMembers={staffMembers} onPrintRequest={openInvoiceChoice} />
            </section>
          )}

          {(effectiveRole === 'admin' || effectiveRole === 'accountant') && (
            <section className="space-y-6">
              <h2 className="text-2xl font-black text-slate-900 pr-4 border-r-4 border-amber-600">المكتب المحاسبي الموحد</h2>
              <AccountantPortal />
            </section>
          )}

          {(effectiveRole === 'admin' || effectiveRole === 'support') && (
            <section className="space-y-6">
              <h2 className="text-2xl font-black text-slate-900 pr-4 border-r-4 border-sky-600">بوابة خدمة العملاء والشكاوى</h2>
              <SupportPortal orders={orders} />
            </section>
          )}

          {(effectiveRole === 'admin' || effectiveRole === 'designer') && (
            <section className="space-y-6">
              <h2 className="text-2xl font-black text-slate-900 pr-4 border-r-4 border-purple-600">قطاع التصميم والعمليات الإبداعية</h2>
              <DesignerPortal />
            </section>
          )}

          {effectiveRole === 'admin' && (
            <section className="space-y-6 pb-20">
              <h2 className="text-2xl font-black text-slate-900 pr-4 border-r-4 border-slate-900">الرؤية الاستراتيجية الشاملة</h2>
              <GeneralManagerPortal orders={orders} />
            </section>
          )}

        </div>
      </div>

      {/* Premium Invoice Choice Dialog */}
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
            <Button variant="ghost" onClick={() => setIsInvoiceChoiceOpen(false)} className="text-slate-400 font-bold">إلغاء</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


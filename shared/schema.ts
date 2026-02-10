import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, real, boolean, integer, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address"), // Formatted full address
  // Structured Address Fields
  city: text("city"),
  district: text("district"),
  street: text("street"),
  building: text("building"),
  landmark: text("landmark"),
  gpsLat: real("gps_lat"),
  gpsLng: real("gps_lng"),

  isAdmin: boolean("is_admin").notNull().default(false),
  isBanned: boolean("is_banned").notNull().default(false),
  role: text("role").notNull().default("customer"), // 'customer', 'admin', 'butcher', 'delivery', 'manager', 'accountant', 'support', 'designer'
  permissions: text("permissions").array().default(sql`ARRAY[]::text[]`),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertUserSchema = createInsertSchema(users).extend({
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  phone: z.string().min(9, "رقم الجوال يجب أن يكون 9 أرقام على الأقل"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "كلمة المرور غير متطابقة",
  path: ["confirmPassword"],
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  image: text("image"),
  parentId: text("parent_id"), // Added for subcategories
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  categoryId: text("category_id").notNull().references(() => categories.id),
  price: real("price").notNull(),
  unit: text("unit").notNull(),
  image: text("image").notNull(),
  description: text("description").notNull(),
  badge: text("badge"),
  size: text("size"),
  weight: text("weight"),
  isFeatured: boolean("is_featured").default(false),
  isActive: boolean("is_active").default(true),
  imageObjectPosition: text("image_object_position"),
  stockQuantity: real("stock_quantity").default(0),
  isOutOfStock: boolean("is_out_of_stock").default(false),
  hasCutting: boolean("has_cutting").default(false),
  hasPackaging: boolean("has_packaging").default(false),
  hasExtras: boolean("has_extras").default(false),
  allowSpecialInstructions: boolean("allow_special_instructions").default(true),
});

// New Table: Delivery Zones
export const deliveryZones = pgTable("delivery_zones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  fee: real("fee").notNull().default(0),
  driverCommission: real("driver_commission").notNull().default(0),
  minOrder: real("min_order").notNull().default(0),
  isActive: boolean("is_active").default(true),
  coordinates: text("coordinates"), // JSON string of polygon points [[lat, lng], ...]
});

// New Table: Product Attributes (Cutting, Packaging)
export const productAttributes = pgTable("product_attributes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'cutting' or 'packaging'
  isActive: boolean("is_active").default(true),
});

// New Table: Coupons
export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  discountType: text("discount_type").notNull(), // 'percentage' or 'fixed'
  discountValue: real("discount_value").notNull(),
  minPurchase: real("min_purchase").default(0),
  expiryDate: text("expiry_date"),
  isActive: boolean("is_active").default(true),
  maxUsage: integer("max_usage"),
  usedCount: integer("used_count").default(0),
  minOrderAmount: real("min_order_amount").default(0),
  userTier: text("user_tier").default("all"), // 'all', 'vip', 'gold'
  applicableProducts: text("applicable_products").default("all"), // comma separated IDs
});

// New Table: Offers
export const offers = pgTable("offers", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  discountPercentage: integer("discount_percentage"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true),
  startDate: text("start_date"),
  endDate: text("end_date"),
  productId: integer("product_id").references(() => products.id),
  type: text("type").default("banner"), // 'banner', 'bogo', 'flash_sale'
});

// New Table: Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// New Table: Drivers
export const drivers = pgTable("drivers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  isActive: boolean("is_active").default(true),
});

// Recipes table removed as requested

// New Table: Staff
export const staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  role: text("role").notNull(), // 'butcher', 'delivery', 'manager', 'accountant', 'support', 'designer'
  isActive: boolean("is_active").default(true),
  joinedAt: text("joined_at").default(sql`CURRENT_TIMESTAMP`),
  permissions: text("permissions").array().default(sql`ARRAY[]::text[]`),
  roleSettings: text("role_settings").default("{}"), // JSON string
  walletBalance: real("wallet_balance").notNull().default(0),
});

// Role-Specific Specialized Tables
export const butcherLogs = pgTable("butcher_logs", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").references(() => staff.id),
  orderId: integer("order_id").references(() => orders.id),
  actionType: text("action_type").notNull(),
  notes: text("notes"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const deliveryTrips = pgTable("delivery_trips", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").references(() => staff.id),
  orderId: integer("order_id").references(() => orders.id),
  startTime: text("start_time"),
  endTime: text("end_time"),
  distance: real("distance"),
  fuelCost: real("fuel_cost"),
  status: text("status").default("ongoing"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const financialRecords = pgTable("financial_records", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").references(() => staff.id),
  type: text("type").notNull(),
  amount: real("amount").notNull(),
  category: text("category"),
  description: text("description"),
  attachmentUrl: text("attachment_url"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").references(() => staff.id),
  userId: uuid("user_id").references(() => users.id),
  orderId: integer("order_id").references(() => orders.id),
  subject: text("subject").notNull(),
  priority: text("priority").default("medium"),
  status: text("status").default("open"),
  description: text("description"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const marketingTasks = pgTable("marketing_tasks", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").references(() => staff.id),
  title: text("title").notNull(),
  description: text("description"),
  targetPlatform: text("target_platform"),
  imageUrl: text("image_url"),
  status: text("status").default("pending"),
  dueDate: text("due_date"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const butcherInventory = pgTable("butcher_inventory", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id),
  staffId: integer("staff_id").references(() => staff.id),
  currentQuantity: real("current_quantity").default(0),
  priceToday: real("price_today"),
  lastUpdated: text("last_updated").default(sql`CURRENT_TIMESTAMP`),
});

export const butcherInventoryLogs = pgTable("butcher_inventory_logs", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").references(() => staff.id),
  productId: integer("product_id").references(() => products.id),
  oldQuantity: real("old_quantity"),
  newQuantity: real("new_quantity"),
  oldPrice: real("old_price"),
  newPrice: real("new_price"),
  actionType: text("action_type"), // 'update', 'add_stock', 'daily_price_change'
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// New Table: Payout Requests
export const payoutRequests = pgTable("payout_requests", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").references(() => staff.id),
  amount: real("amount").notNull(),
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected'
  method: text("method").notNull().default("bank_transfer"),
  notes: text("notes"),
  pickupDetails: jsonb("pickup_details"), // Updated to jsonb to store object directly
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// New Table: Site Settings
export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(), // JSON string
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  total: real("total").notNull(),
  status: text("status").notNull().default("pending"),
  address: text("address").notNull(),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  notes: text("notes"),
  paymentMethod: text("payment_method").default("cash"),
  driverId: integer("driver_id").references(() => drivers.id), // External driver
  butcherStaffId: integer("butcher_staff_id").references(() => staff.id), // Assigned butcher
  driverStaffId: integer("driver_staff_id").references(() => staff.id), // Assigned delivery staff
  zoneId: integer("zone_id").references(() => deliveryZones.id),
  gpsLat: real("gps_lat"),
  gpsLng: real("gps_lng"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});


export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  productId: integer("product_id").notNull().references(() => products.id),
  productName: text("product_name"),
  quantity: integer("quantity").notNull(),
  price: real("price").notNull(),
  cutting: text("cutting"),
  packaging: text("packaging"),
  extras: text("extras"),
  notes: text("notes"),
});

export const insertStaffSchema = createInsertSchema(staff);
export const insertCategorySchema = createInsertSchema(categories);
export const insertProductSchema = createInsertSchema(products);
export const insertOrderSchema = createInsertSchema(orders);
export const insertOrderItemSchema = createInsertSchema(orderItems);
export const insertDeliveryZoneSchema = createInsertSchema(deliveryZones);
export const insertProductAttributeSchema = createInsertSchema(productAttributes);
export const insertCouponSchema = createInsertSchema(coupons);
export const insertDriverSchema = createInsertSchema(drivers);
export const insertOfferSchema = createInsertSchema(offers);
export const insertNotificationSchema = createInsertSchema(notifications);
export const insertSiteSettingsSchema = createInsertSchema(siteSettings);
export const insertPayoutRequestSchema = createInsertSchema(payoutRequests);

// Specialized schemas
export const insertButcherLogSchema = createInsertSchema(butcherLogs);
export const insertDeliveryTripSchema = createInsertSchema(deliveryTrips);
export const insertFinancialRecordSchema = createInsertSchema(financialRecords);
export const insertSupportTicketSchema = createInsertSchema(supportTickets);
export const insertMarketingTaskSchema = createInsertSchema(marketingTasks);
export const insertButcherInventorySchema = createInsertSchema(butcherInventory);
export const insertButcherInventoryLogSchema = createInsertSchema(butcherInventoryLogs);

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export type DeliveryZone = typeof deliveryZones.$inferSelect;
export type ProductAttribute = typeof productAttributes.$inferSelect;
export type Coupon = typeof coupons.$inferSelect;
export type Driver = typeof drivers.$inferSelect;
export type Staff = typeof staff.$inferSelect;
export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type Offer = typeof offers.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type SiteSettings = typeof siteSettings.$inferSelect;

export type ButcherLog = typeof butcherLogs.$inferSelect;
export type ButcherInventory = typeof butcherInventory.$inferSelect;
export type ButcherInventoryLog = typeof butcherInventoryLogs.$inferSelect;
export type DeliveryTrip = typeof deliveryTrips.$inferSelect;
export type FinancialRecord = typeof financialRecords.$inferSelect;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type MarketingTask = typeof marketingTasks.$inferSelect;
export type PayoutRequest = typeof payoutRequests.$inferSelect;
export type InsertPayoutRequest = z.infer<typeof insertPayoutRequestSchema>;

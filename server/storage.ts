import { type User, type InsertUser, type Category, type Product, type Order, type InsertOrder, type OrderItem, type InsertOrderItem } from "@shared/schema";
import { initialCategories, initialProducts } from "./seed_data";
import { randomUUID } from "crypto";
import { supabase } from "./supabase";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Products & Categories
  getCategories(): Promise<Category[]>;
  updateCategory(id: string, category: any): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  getProductsByCategory(categoryId: string): Promise<Product[]>;
  createProduct(product: any): Promise<Product>;
  updateProduct(id: number, product: any): Promise<Product>;
  deleteProduct(id: number): Promise<void>;
  createCategory(category: Category): Promise<Category>;

  // Orders
  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order>;
  getOrders(): Promise<(Order & { items: OrderItem[] })[]>;
  getUserOrders(userId: string): Promise<(Order & { items: OrderItem[] })[]>;
  updateOrderStatus(id: number, status: string): Promise<Order>;

  // Attributes
  getAttributes(): Promise<any[]>;
  createAttribute(attr: any): Promise<any>;
  deleteAttribute(id: number): Promise<void>;

  // Delivery Zones
  getDeliveryZones(): Promise<any[]>;
  createDeliveryZone(zone: any): Promise<any>;
  updateDeliveryZone(id: number, zone: any): Promise<any>;
  deleteDeliveryZone(id: number): Promise<void>;

  // Marketing
  getCoupons(): Promise<any[]>;
  createCoupon(coupon: any): Promise<any>;
  updateCoupon(id: number, coupon: any): Promise<any>;
  deleteCoupon(id: number): Promise<void>;
  getOffers(): Promise<any[]>;
  createOffer(offer: any): Promise<any>;
  updateOffer(id: number, offer: any): Promise<any>;
  deleteOffer(id: number): Promise<void>;

  // Customers
  getUsers(): Promise<User[]>;
  updateUser(id: string, data: any): Promise<User>;

  // Notifications
  createNotification(notif: any): Promise<any>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private categories: Map<string, Category>;
  private products: Map<number, Product>;
  private orders: Map<number, Order>;
  private orderItems: Map<number, OrderItem>;

  constructor() {
    this.users = new Map();
    this.categories = new Map();
    this.products = new Map();
    this.orders = new Map();
    this.orderItems = new Map();

    // initialCategories and initialProducts are used as local fallbacks
    initialCategories.forEach(cat => this.categories.set(cat.id, cat));
    initialProducts.forEach(prod => this.products.set(prod.id, prod));
  }

  async getUser(id: string): Promise<User | undefined> {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
    if (error) return undefined;
    return {
      ...data,
      isAdmin: data.is_admin,
      isBanned: data.is_banned,
      createdAt: data.created_at
    } as User;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const { data, error } = await supabase.from('users').select('*').eq('username', username).single();
    if (error) return undefined;
    return {
      ...data,
      isAdmin: data.is_admin,
      isBanned: data.is_banned,
      createdAt: data.created_at
    } as User;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const { data, error } = await supabase.from('users').insert([{
      username: insertUser.username,
      password: insertUser.password,
      email: insertUser.email,
      phone: insertUser.phone,
      is_admin: insertUser.isAdmin || false,
      role: insertUser.role || "customer",
      permissions: insertUser.permissions || [],
      is_banned: false
    }]).select().single();

    if (error) {
      console.error("Error creating user in Supabase:", error);
      throw error;
    }
    return data as User;
  }

  async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase.from('categories').select('*');
    if (error) {
      console.error("Error fetching categories:", error);
      return Array.from(this.categories.values());
    }
    return data as Category[];
  }

  async getProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error("Error fetching products:", error);
      return Array.from(this.products.values()).filter(p => (p as any).isActive !== false);
    }

    return (data || []).map(p => ({
      ...p,
      isActive: p.is_active
    })) as Product[];
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
    if (error) return Array.from(this.products.values()).find(p => p.id === id);
    return {
      ...data,
      isActive: data.is_active
    } as Product;
  }

  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('category_id', categoryId)
      .eq('is_active', true);

    if (error) {
      return Array.from(this.products.values()).filter(p => p.categoryId === categoryId && (p as any).isActive !== false);
    }

    return (data || []).map(p => ({
      ...p,
      isActive: p.is_active
    })) as Product[];
  }

  async createProduct(product: any): Promise<Product> {
    const { data, error } = await supabase.from('products').insert([product]).select().single();
    if (error) throw error;
    return data as Product;
  }

  async updateProduct(id: number, product: any): Promise<Product> {
    const { data, error } = await supabase.from('products').update(product).eq('id', id).select().single();
    if (error) throw error;
    return data as Product;
  }

  async deleteProduct(id: number): Promise<void> {
    const { error } = await supabase.from('products').update({ is_active: false }).eq('id', id);
    if (error) throw error;
  }

  async createCategory(category: Category): Promise<Category> {
    const { data, error } = await supabase.from('categories').insert([category]).select().single();
    if (error) throw error;
    return data as Category;
  }

  async updateCategory(id: string, category: any): Promise<Category> {
    const { data, error } = await supabase.from('categories').update(category).eq('id', id).select().single();
    if (error) throw error;
    return data as Category;
  }

  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
  }

  async getAttributes(): Promise<any[]> {
    const { data, error } = await supabase.from('product_attributes').select('*');
    if (error) return [];
    return data;
  }

  async createAttribute(attr: any): Promise<any> {
    const { data, error } = await supabase.from('product_attributes').insert([attr]).select().single();
    if (error) throw error;
    return data;
  }

  async deleteAttribute(id: number): Promise<void> {
    const { error } = await supabase.from('product_attributes').delete().eq('id', id);
    if (error) throw error;
  }

  async getDeliveryZones(): Promise<any[]> {
    const { data, error } = await supabase.from('delivery_zones').select('*');
    if (error) return [];
    return data;
  }

  async createDeliveryZone(zone: any): Promise<any> {
    const { data, error } = await supabase.from('delivery_zones').insert([zone]).select().single();
    if (error) throw error;
    return data;
  }

  async updateDeliveryZone(id: number, zone: any): Promise<any> {
    const { data, error } = await supabase.from('delivery_zones').update(zone).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async deleteDeliveryZone(id: number): Promise<void> {
    const { error } = await supabase.from('delivery_zones').delete().eq('id', id);
    if (error) throw error;
  }

  async getCoupons(): Promise<any[]> {
    const { data, error } = await supabase.from('coupons').select('*');
    if (error) return [];
    return data;
  }

  async createCoupon(coupon: any): Promise<any> {
    const { data, error } = await supabase.from('coupons').insert([coupon]).select().single();
    if (error) throw error;
    return data;
  }

  async updateCoupon(id: number, coupon: any): Promise<any> {
    const { data, error } = await supabase.from('coupons').update(coupon).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async deleteCoupon(id: number): Promise<void> {
    const { error } = await supabase.from('coupons').delete().eq('id', id);
    if (error) throw error;
  }

  async getOffers(): Promise<any[]> {
    const { data, error } = await supabase.from('offers').select('*');
    if (error) return [];
    return data;
  }

  async createOffer(offer: any): Promise<any> {
    const { data, error } = await supabase.from('offers').insert([offer]).select().single();
    if (error) throw error;
    return data;
  }

  async updateOffer(id: number, offer: any): Promise<any> {
    const { data, error } = await supabase.from('offers').update(offer).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async deleteOffer(id: number): Promise<void> {
    const { error } = await supabase.from('offers').delete().eq('id', id);
    if (error) throw error;
  }

  async getUsers(): Promise<User[]> {
    const { data, error } = await supabase.from('users').select('*');
    if (error) return Array.from(this.users.values());
    return (data || []).map(u => ({
      ...u,
      isAdmin: u.is_admin,
      isBanned: u.is_banned,
      createdAt: u.created_at
    })) as User[];
  }

  async updateUser(id: string, data: any): Promise<User> {
    const { data: user, error } = await supabase.from('users').update(data).eq('id', id).select().single();
    if (error) throw error;
    return {
      ...user,
      isAdmin: user.is_admin,
      isBanned: user.is_banned,
      createdAt: user.created_at
    } as User;
  }

  async createNotification(notif: any): Promise<any> {
    const { data, error } = await supabase.from('notifications').insert([notif]).select().single();
    if (error) throw error;
    return data;
  }

  async createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order> {
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([{
        user_id: order.userId,
        total: order.total,
        status: order.status || 'pending',
        address: order.address,
        customer_name: order.customerName,
        customer_phone: order.customerPhone,
        notes: order.notes,
        payment_method: order.paymentMethod || 'cash'
      }])
      .select()
      .single();

    if (orderError) throw orderError;

    const orderItemsToInsert = items.map(item => ({
      order_id: orderData.id,
      product_id: item.productId,
      product_name: item.productName,
      quantity: item.quantity,
      price: item.price,
      cutting: item.cutting,
      packaging: item.packaging,
      extras: item.extras,
      notes: item.notes
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(orderItemsToInsert);
    if (itemsError) throw itemsError;

    return orderData as Order;
  }

  async getOrders(): Promise<(Order & { items: OrderItem[] })[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*, items:order_items(*)');

    if (error) return [];
    return data as (Order & { items: OrderItem[] })[];
  }

  async getUserOrders(userId: string): Promise<(Order & { items: OrderItem[] })[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('user_id', userId);

    if (error) return [];
    return data as (Order & { items: OrderItem[] })[];
  }

  async updateOrderStatus(id: number, status: string): Promise<Order> {
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Order;
  }
}

export const storage = new MemStorage();

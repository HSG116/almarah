import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { type User as SelectUser } from "@shared/schema";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/categories", async (_req, res) => {
    const categories = await storage.getCategories();
    res.json(categories);
  });

  // --- Image Upload & Optimization ---
  const upload = multer({ storage: multer.memoryStorage() });
  const UPLOAD_DIR = path.join(process.cwd(), "uploads");

  // Ensure directory exists
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  app.post("/api/upload", (req, res, next) => {
    console.log("🚀 [UPLOAD_DEBUG] Request received at /api/upload");
    next();
  }, upload.single("image"), async (req, res) => {
    console.log("📁 [UPLOAD_DEBUG] Multer processed. File:", req.file ? req.file.originalname : "NONE");

    if (!req.file) {
      console.warn("⚠️ [UPLOAD_DEBUG] No file in request");
      return res.status(400).json({ message: "لم يتم رفع أي صورة" });
    }

    console.log(`📁 [UPLOAD_DEBUG] Processing file: ${req.file.originalname} (${req.file.size} bytes)`);

    try {
      const timestamp = Date.now();
      const safeName = req.file.originalname.replace(/[^a-zA-Z0-9.]/g, "_");
      const fileName = `${timestamp}-${safeName}`;
      const filePath = path.join(UPLOAD_DIR, fileName);
      let outputBuffer = req.file.buffer;

      // Try optimization
      try {
        console.log("⚙️ [UPLOAD_DEBUG] Attempting optimization with Sharp...");
        let width = 1200;
        let quality = 80;

        outputBuffer = await sharp(req.file.buffer)
          .resize({ width, withoutEnlargement: true })
          .jpeg({ quality, progressive: true })
          .toBuffer();

        console.log(`✅ [UPLOAD_DEBUG] Sharp optimization successful. New size: ${outputBuffer.length} bytes`);
      } catch (sharpError: any) {
        console.error("⚠️ [UPLOAD_DEBUG] Sharp optimization failed:", sharpError.message);
        // Fallback to original buffer
      }

      await fs.promises.writeFile(filePath, outputBuffer);
      const publicUrl = `/uploads/${fileName}`;
      console.log("💾 [UPLOAD_DEBUG] File saved successfully to:", publicUrl);

      res.json({ url: publicUrl });
    } catch (error: any) {
      console.error("❌ [UPLOAD_DEBUG] Full upload failure:", error);
      res.status(500).json({ message: "فشل رفع الصورة على الخادم", error: error.message });
    }
  });

  // Telegram Verification Logic
  // --- Telegram Deep Linking Auth ---

  // 1. Init: Generate Token & Link
  app.post("/api/auth/telegram/init", async (req, res) => {
    const { phone } = req.body;
    console.log(`🚀 [TELEGRAM_AUTH] Received init request for phone: ${phone}`);

    if (!phone) {
      console.error("❌ [TELEGRAM_AUTH] Phone missing in request body");
      return res.status(400).json({ message: "Phone is required" });
    }

    const verifyToken = Math.random().toString(36).substring(2, 16);
    const { verificationSession } = await import("./telegram");

    // Normalize phone
    const cleanPhone = phone.replace('+', '').replace(/\D/g, '');
    console.log(`📡 [TELEGRAM_AUTH] Creating session for token: ${verifyToken}, cleanPhone: ${cleanPhone}`);

    verificationSession[verifyToken] = {
      phone: cleanPhone,
      status: 'PENDING'
    };

    const botLink = `https://t.me/sms_otp_new_bot?start=${verifyToken}`;
    console.log(`🔗 [TELEGRAM_AUTH] Bot link generated: ${botLink}`);
    res.json({ token: verifyToken, link: botLink });
  });

  // 2. Status: Check if verified
  app.get("/api/auth/telegram/status", async (req, res) => {
    const verifyToken = req.query.token as string;
    if (!verifyToken) return res.status(400).json({ message: "Token required" });

    const { verificationSession } = await import("./telegram");
    const session = verificationSession[verifyToken];

    if (!session) {
      return res.status(404).json({ message: "Session expired" });
    }

    res.json({ status: session.status });
  });

  app.get("/api/products", async (req, res) => {
    const categoryId = req.query.category as string;
    if (categoryId && categoryId !== 'all') {
      const products = await storage.getProductsByCategory(categoryId);
      res.json(products);
    } else {
      const products = await storage.getProducts();
      res.json(products);
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const product = await storage.getProduct(id);
    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }
    res.json(product);
  });

  app.post("/api/orders", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }

    const { items, address, total, customerName, customerPhone, notes } = req.body;
    if (!items || !items.length) {
      return res.status(400).send("No items in order");
    }

    const user = req.user as SelectUser;

    console.log('📦 Creating order for user:', user.id);
    console.log('📦 Order details:', { total, address, customerName, customerPhone, itemCount: items.length });

    const order = await storage.createOrder(
      {
        userId: user.id,
        total: total,
        address: address,
        status: "pending",
        customerName: customerName,
        customerPhone: customerPhone,
        notes: notes,
      },
      items.map((item: any) => ({
        productId: item.id,
        quantity: item.quantity,
        price: item.price,
        cutting: item.selectedCutting || null,
        packaging: item.selectedPackaging || null,
        notes: item.note || null,
      }))
    );

    console.log('✅ Order created successfully:', order.id);
    res.status(201).json(order);
  });

  // --- Product Management Routes ---
  // --- Product Management Routes Removed (Handled by Client + Supabase) ---
  /*
  app.post("/api/products", ...);
  app.patch("/api/products/:id", ...);
  app.delete("/api/products/:id", ...);
  app.post("/api/categories", ...);
  */

  app.get("/api/orders", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }

    const orders = await storage.getUserOrders((req.user as SelectUser).id);
    res.json(orders);
  });

  return httpServer;
}

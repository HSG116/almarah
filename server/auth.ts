import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { supabase } from "./supabase";
import { User as SelectUser } from "@shared/schema";

const scryptAsync = promisify(scrypt);
const MemoryStore = createMemoryStore(session);

export async function hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const supplyBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, supplyBuf);
}

export function setupAuth(app: Express) {
    const sessionSettings: session.SessionOptions = {
        secret: process.env.SESSION_SECRET || "kashta_secret_key",
        resave: false,
        saveUninitialized: false,
        store: new MemoryStore({
            checkPeriod: 86400000,
        }),
        cookie: {
            secure: app.get("env") === "production",
        },
    };

    if (app.get("env") === "production") {
        app.set("trust proxy", 1);
    }

    app.use(session(sessionSettings));
    app.use(passport.initialize());
    app.use(passport.session());

    passport.use(
        new LocalStrategy(async (username, password, done) => {
            try {
                const user = await storage.getUserByUsername(username);
                if (!user || !(await comparePasswords(password, user.password))) {
                    return done(null, false);
                }
                return done(null, user);
            } catch (error) {
                return done(error);
            }
        }),
    );

    passport.serializeUser((user, done) => done(null, (user as SelectUser).id));
    passport.deserializeUser(async (id: string, done) => {
        try {
            const user = await storage.getUser(id);
            done(null, user);
        } catch (error) {
            done(error);
        }
    });

    app.post("/api/register", async (req, res, next) => {
        try {
            const existingUser = await storage.getUserByUsername(req.body.username);
            if (existingUser) {
                return res.status(400).send("Username already exists");
            }

            const hashedPassword = await hashPassword(req.body.password);
            const user = await storage.createUser({
                ...req.body,
                password: hashedPassword,
            });

            req.login(user, (err) => {
                if (err) return next(err);
                res.status(201).json(user);
            });
        } catch (error) {
            next(error);
        }
    });

    app.post("/api/login", passport.authenticate("local"), (req, res) => {
        res.status(200).json(req.user);
    });

    app.post("/api/logout", (req, res, next) => {
        req.logout((err) => {
            if (err) return next(err);
            res.sendStatus(200);
        });
    });

    app.get("/api/user", (req, res) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        res.json(req.user);
    });

    // Admin-only: Create staff account with hashed password
    app.post("/api/admin/create-staff", async (req, res, next) => {
        console.log("🔹 [CREATE-STAFF] Request received", { username: req.body.username, role: req.body.role });

        const requestUser = req.user as SelectUser;
        const isUserAdmin = requestUser?.isAdmin === true || requestUser?.role === 'admin';

        if (!requestUser || !isUserAdmin) {
            console.warn("⚠️ [ADMIN_ONLY] Unauthorized access attempt to create-staff by:", requestUser?.username);
            return res.status(403).json({ message: "عذراً، هذا الإجراء مخصص للمديرين فقط" });
        }

        try {
            const { username, password, email, phone, name, role, permissions } = req.body;

            const existingUser = await storage.getUserByUsername(username);
            if (existingUser) {
                console.error("❌ [CREATE-STAFF] Username already exists:", username);
                return res.status(400).json({ message: "اسم المستخدم موجود بالفعل" });
            }

            const hashedPassword = await hashPassword(password);

            // 1. Create User
            console.log("👤 [CREATE-STAFF] Creating user account...");
            const user = await storage.createUser({
                username,
                password: hashedPassword,
                confirmPassword: hashedPassword,
                email,
                phone,
                role,
                permissions,
                isAdmin: true
            });
            console.log("✅ [CREATE-STAFF] User created successfully:", user.id);

            // 2. Create Staff record
            console.log("📋 [CREATE-STAFF] Creating staff record...");
            const { data: staffData, error: staffError } = await supabase.from('staff').insert([{
                user_id: user.id,
                name,
                phone,
                role,
                permissions,
                is_active: true
            }]).select();

            if (staffError) {
                console.error("❌ [CREATE-STAFF] Error creating staff record:");
                console.error("Error code:", staffError.code);
                console.error("Error message:", staffError.message);
                console.error("Error details:", staffError.details);
                console.error("Error hint:", staffError.hint);
                throw new Error(`فشل إنشاء سجل الموظف: ${staffError.message}`);
            }

            console.log("✅ [CREATE-STAFF] Staff record created successfully:", staffData);

            res.status(201).json(user);

        } catch (error: any) {
            console.error("💥 [CREATE-STAFF] Fatal error:", error.message);
            console.error("Stack:", error.stack);
            res.status(500).json({ message: error.message || "خطأ في إنشاء حساب الموظف" });
        }
    });

    app.get("/api/admin/users/recent", async (req, res) => {
        const user = req.user as SelectUser;
        const isUserAdmin = user?.isAdmin === true || (user as any)?.is_admin === true || user?.role === 'admin';

        if (!user || !isUserAdmin) {
            console.warn("🚫 [ADMIN_ACCESS_DENIED] to users/recent by:", user?.username);
            return res.status(403).json({ message: "غير مصرح لك بالوصول لبيانات المستخدمين" });
        }

        try {
            console.log("🔍 [DEBUG] Attempting to fetch all users...");

            // Try fetching via Supabase directly first
            const { data: users, error } = await supabase
                .from('users')
                .select('id, username, email, phone, role')
                .order('username', { ascending: true });

            if (error) {
                console.error("❌ [DEBUG] Supabase fetch error:", error.message);
                // Fallback or throw
            }

            if (!users || users.length === 0) {
                console.warn("⚠️ [DEBUG] No users found in Supabase 'users' table.");
            } else {
                console.log(`✅ [DEBUG] Found ${users.length} users:`, users.map(u => u.username).join(", "));
            }

            res.json(users || []);
        } catch (error: any) {
            console.error("❌ [DEBUG] Fatal error in users endpoint:", error.message);
            res.status(500).json({ message: error.message });
        }
    });

    // 2. Promote an existing user to staff
    app.post("/api/admin/promote-staff", async (req, res) => {
        const user = req.user as SelectUser;
        const isUserAdmin = user?.isAdmin === true || (user as any)?.is_admin === true || user?.role === 'admin';

        if (!user || !isUserAdmin) {
            console.warn("🚫 [ADMIN_ACCESS_DENIED] to promote-staff by:", user?.username);
            return res.status(403).json({ message: "غير مصرح لك بترقية المستخدمين" });
        }

        try {
            const { userId, name, phone, role, permissions } = req.body;

            if (!userId || !name || !role) {
                return res.status(400).json({ message: "UserId, Name and Role are required" });
            }

            // Update user table - set role
            const { error: userUpdateError } = await supabase
                .from('users')
                .update({ role: role, permissions: permissions || [], is_admin: true })
                .eq('id', userId);

            if (userUpdateError) throw userUpdateError;

            // Create staff record
            const { data: staffData, error: staffError } = await supabase
                .from('staff')
                .insert([{
                    user_id: userId,
                    name,
                    phone: phone || "",
                    role,
                    permissions: permissions || [],
                    is_active: true
                }])
                .select()
                .single();

            if (staffError) throw staffError;

            res.status(201).json(staffData);
        } catch (error: any) {
            console.error("❌ [PROMOTE-STAFF] Error:", error.message);
            res.status(500).json({ message: error.message });
        }
    });
}


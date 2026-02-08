import { createContext, useContext, useState, ReactNode } from "react";
import { type Product } from "@shared/schema";
import { toast } from "@/hooks/use-toast";

export interface CartItem extends Product {
    quantity: number;
    cutting?: string;
    packaging?: string;
    extras?: string;
    notes?: string;
}

interface CartContextType {
    items: CartItem[];
    addItem: (product: Product, quantity: number, options?: { cutting?: string, packaging?: string, extras?: string, notes?: string }) => void;
    removeItem: (productId: number) => void;
    updateQuantity: (productId: number, delta: number) => void;
    total: number;
    subtotal: number;
    deliveryFee: number;
    clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const deliveryFee = 25;

    const addItem = (product: Product, quantity: number, options?: { cutting?: string, packaging?: string, extras?: string, notes?: string }) => {
        setItems((prev) => {
            // Check if existing item has same ID AND same options
            const existing = prev.find((item) =>
                item.id === product.id &&
                item.cutting === options?.cutting &&
                item.packaging === options?.packaging &&
                item.extras === options?.extras
            );

            if (existing) {
                return prev.map((item) =>
                    (item.id === product.id && item.cutting === options?.cutting && item.packaging === options?.packaging && item.extras === options?.extras)
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            }
            return [...prev, { ...product, quantity, ...options }];
        });
        toast({
            title: "تمت الإضافة للسلة",
            description: `تم إضافة ${quantity} من ${product.name} بنجاح`,
            className: "bg-primary text-primary-foreground border-none text-right"
        });
    };

    const removeItem = (productId: number) => {
        setItems((prev) => prev.filter((item) => item.id !== productId));
    };

    const updateQuantity = (productId: number, delta: number) => {
        setItems((prev) =>
            prev.map((item) => {
                if (item.id === productId) {
                    const newQuantity = Math.max(1, item.quantity + delta);
                    return { ...item, quantity: newQuantity };
                }
                return item;
            })
        );
    };

    const clearCart = () => setItems([]);

    const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const total = subtotal > 0 ? subtotal + deliveryFee : 0;

    return (
        <CartContext.Provider
            value={{
                items,
                addItem,
                removeItem,
                updateQuantity,
                total,
                subtotal,
                deliveryFee,
                clearCart,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
}

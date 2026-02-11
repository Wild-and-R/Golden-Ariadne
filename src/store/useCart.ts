import { create } from 'zustand';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartStore {
  cart: CartItem[];
  addToCart: (product: CartItem) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
}

export const useCart = create<CartStore>((set) => ({
  cart: [],
  addToCart: (product) => set((state) => ({ cart: [...state.cart, product] })),
  removeFromCart: (id) => set((state) => ({ cart: state.cart.filter(i => i.id !== id) })),
  clearCart: () => set({ cart: [] }),
}));
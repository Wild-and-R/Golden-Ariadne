import { create } from 'zustand'

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  stock: number
}

interface CartStore {
  cart: CartItem[]
  setCart: (cart: CartItem[]) => void
  addToCart: (product: CartItem) => void
  clearCart: () => void
  increaseQuantity: (id: string) => void
  decreaseQuantity: (id: string) => void
}

export const useCart = create<CartStore>((set) => ({
  cart: [],

  setCart: (cart) => set({ cart }),

  addToCart: (product) =>
    set((state) => {
      const existing = state.cart.find(
        (item) => item.id === product.id
      )

      if (existing) {
        if (existing.quantity >= existing.stock) return state

        return {
          cart: state.cart.map((item) =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        }
      }

      return {
        cart: [...state.cart, { ...product, quantity: 1 }],
      }
    }),

  clearCart: () => set({ cart: [] }),

  increaseQuantity: (id) =>
    set((state) => ({
      cart: state.cart.map((item) => {
        if (item.id === id) {
          if (item.quantity >= item.stock) return item
          return { ...item, quantity: item.quantity + 1 }
        }
        return item
      }),
    })),

  decreaseQuantity: (id) =>
    set((state) => ({
      cart: state.cart
        .map((item) =>
          item.id === id
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0),
    })),
}))

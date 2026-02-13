'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface OrderItem {
  id: string
  product_id: string
  quantity: number
  price_at_purchase: number
  name: string
}

interface Order {
  id: string
  payment_id: string
  total_amount: number
  status: string
  created_at: string
  shipping_address: string
  items: OrderItem[]
}

const formatIDR = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
  }).format(amount)

export default function OrdersPage() {
  const supabase = createClient()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
  let channel: any

  const fetchOrders = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    // Initial fetch
    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_id,
          quantity,
          price_at_purchase,
          products(name)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (data) {
      const formatted = data.map((order: any) => ({
        ...order,
        items: order.order_items.map((oi: any) => ({
          id: oi.id,
          product_id: oi.product_id,
          quantity: oi.quantity,
          price_at_purchase: oi.price_at_purchase,
          name: oi.products?.name ?? 'Unknown',
        })),
      }))

      setOrders(formatted)
    }

    setLoading(false)

    // Realtime update
    channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Order updated:', payload)

          setOrders((prev) =>
            prev.map((order) =>
              order.id === payload.new.id
                ? { ...order, status: payload.new.status }
                : order
            )
          )
        }
      )
      .subscribe()
  }

  fetchOrders()

  return () => {
    if (channel) {
      supabase.removeChannel(channel)
    }
  }
}, [])


  const statusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-blue-400'
      case 'shipped':
        return 'text-blue-500'
      case 'delivered':
        return 'text-green-400'
      case 'paid':
        return 'text-green-400'
      default:
        return 'text-red-500'
    }
  }

  return (
    <main className="min-h-screen bg-black p-8 text-yellow-400">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <button
          onClick={() => router.push('/home')}
          className="rounded-md border border-yellow-400 px-4 py-2 text-sm font-semibold text-yellow-400 hover:bg-yellow-400 hover:text-black"
        >
          ← Back to Home
        </button>

        <h1 className="text-3xl font-bold">My Orders</h1>

        <div className="w-[120px]" />
      </div>

      <div className="max-w-3xl mx-auto">
        {loading ? (
          <p className="text-center">Loading orders...</p>
        ) : orders.length === 0 ? (
          <div className="mt-12 text-center">
            <p className="mb-6 text-lg">
              You haven’t placed any orders yet.
            </p>

            <button
              onClick={() => router.push('/home')}
              className="rounded-md bg-yellow-500 px-6 py-3 font-semibold text-black hover:bg-yellow-400"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-lg border border-yellow-400 p-6"
              >
                <div className="flex justify-between mb-2">
                  <span className="font-semibold">Order ID:</span>
                  <span>{order.payment_id}</span>
                </div>

                <div className="flex justify-between mb-2">
                  <span className="font-semibold">Status:</span>
                  <span
                    className={`font-semibold capitalize ${statusColor(
                      order.status
                    )}`}
                  >
                    {order.status}
                  </span>
                </div>

                <div className="flex justify-between mb-2">
                  <span className="font-semibold">Total:</span>
                  <span>{formatIDR(order.total_amount)}</span>
                </div>

                <div className="mb-2">
                  <span className="font-semibold">
                    Shipping Address:
                  </span>
                  <p className="ml-2">{order.shipping_address}</p>
                </div>

                <div className="mt-2 border-t border-yellow-400 pt-2">
                  <span className="font-semibold">Items:</span>
                  <ul className="ml-4 mt-1 space-y-1">
                    {order.items.map((item) => (
                      <li key={item.id}>
                        {item.name} x {item.quantity} –{' '}
                        {formatIDR(
                          item.price_at_purchase * item.quantity
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

interface OrderItem {
  id: string
  quantity: number
  price_at_purchase: number
  products: { name: string }
}

interface Order {
  id: string
  payment_id: string
  status: string
  total_amount: number
  shipping_address: string
  user_id: string
  order_items: OrderItem[]
}

const formatIDR = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
  }).format(amount)

export default function AdminOrdersPage() {
  const supabase = createClient()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch orders & check admin
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') return router.push('/home')

      const { data } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            price_at_purchase,
            products(name)
          )
        `)
        .order('created_at', { ascending: false })

      if (data) setOrders(data)
      setLoading(false)
    }

    init()
  }, [router, supabase])

  // Real-time subscription to orders
  useEffect(() => {
    let subscription: any
    const setup = async () => {
      subscription = await supabase
        .channel('orders')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          (payload: any) => {
            const updated = payload.new
            setOrders((prev) =>
              prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
            )
          }
        )
        .subscribe()
    }
    setup()

    return () => {
      if (subscription) supabase.removeChannel(subscription)
    }
  }, [supabase])

  // Update order status
  const updateStatus = async (orderId: string, status: string) => {
  // Update the order status in DB
  const { data: updatedOrders } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select()
  
  if (!updatedOrders?.[0]) return alert('Failed to update status')

  // Update local state
  setOrders((prev) =>
    prev.map((o) => (o.id === orderId ? { ...o, status } : o))
  )

  // Send status-change email via server API
  await fetch('/api/send-status-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ orderId, status }),
})
  .then(res => res.json())
  .then(data => {
    if (data.error) console.error('Email error:', data.error)
  })
  .catch(err => console.error('Fetch error:', err))
}

  if (loading)
    return <p className="p-10 text-yellow-400">Loading...</p>

  return (
    <main className="min-h-screen bg-black p-8 text-yellow-400">
      <div className="mb-8 flex items-center justify-between">
        <button
          onClick={() => router.push('/home')}
          className="rounded-md border border-yellow-400 px-4 py-2 text-sm font-semibold text-yellow-400 hover:bg-yellow-400 hover:text-black"
        >
          ← Back to Home
        </button>

        <h1 className="text-3xl font-bold text-center flex-1">
          Admin - Manage Orders
        </h1>

        <div className="w-[120px]" />
      </div>

      <div className="space-y-6 max-w-4xl mx-auto">
        {orders.map((order) => (
          <div key={order.id} className="rounded-lg border border-yellow-400 p-6">
            <div className="flex justify-between mb-2">
              <span>Order:</span>
              <span>{order.payment_id}</span>
            </div>

            <div className="flex justify-between mb-2">
              <span>Status:</span>
              <select
                value={order.status}
                onChange={(e) => updateStatus(order.id, e.target.value)}
                className="bg-black border border-yellow-400 px-2 py-1 text-yellow-400"
              >
                <option value="pending">pending</option>
                <option value="paid">paid</option>
                <option value="shipped">shipped</option>
                <option value="delivered">delivered</option>
                <option value="cancelled">cancelled</option>
              </select>
            </div>

            <div className="flex justify-between mb-2">
              <span>Total:</span>
              <span>{formatIDR(order.total_amount)}</span>
            </div>

            <div className="mb-2">
              <span>Shipping Address:</span>
              <p className="ml-2">{order.shipping_address}</p>
            </div>

            <div className="mt-2 border-t border-yellow-400 pt-2">
              <span>Items:</span>
              <ul className="ml-4 mt-1 space-y-1">
                {order.order_items.map((item) => (
                  <li key={item.id}>
                    {item.products?.name} x {item.quantity} —{' '}
                    {formatIDR(item.price_at_purchase * item.quantity)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}

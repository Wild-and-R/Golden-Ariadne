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
  const updateStatus = async (orderId: string, newStatus: string) => {
  const order = orders.find((o) => o.id === orderId)
  if (!order) return

  // Special confirmation for cancellation
  if (newStatus === 'cancelled') {
    const confirmCancel = confirm(
      `You are about to CANCEL this order.\n\n` +
      `This will:\n` +
      `• Refund the customer via Midtrans\n` +
      `• Restore product stock\n` +
      `• Delete the order from database\n\n` +
      `Are you sure you want to continue?`
    )

    if (!confirmCancel) return

    await fetch('/api/cancel-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    })

    setOrders((prev) => prev.filter((o) => o.id !== orderId))
    return
  }

  // Confirmation for normal status changes
  if (newStatus !== order.status) {
    const confirmChange = confirm(
      `Change status of order ${order.payment_id}\n\n` +
      `From: ${order.status}\n` +
      `To: ${newStatus}\n\n` +
      `Customer will receive an email notification.\n\n` +
      `Proceed?`
    )

    if (!confirmChange) return
  }

  // Update in DB
  const { data: updatedOrders } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId)
    .select()

  if (!updatedOrders?.[0]) {
    alert('Failed to update status')
    return
  }

  // Update local state
  setOrders((prev) =>
    prev.map((o) =>
      o.id === orderId ? { ...o, status: newStatus } : o
    )
  )

  // Send email
  await fetch('/api/send-status-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, status: newStatus }),
  })
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
                onChange={(e) =>
                  updateStatus(order.id, e.target.value)
                }
                className="bg-black border border-yellow-400 px-2 py-1 text-yellow-400"
              >
                <option value="pending">pending</option>
                <option value="paid">paid</option>
                <option value="cancel_requested">cancel_requested</option>
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

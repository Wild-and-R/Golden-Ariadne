'use client'

import { useCart } from '@/store/useCart'
import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'
import Script from 'next/script'
import { useRouter } from 'next/navigation'

const formatIDR = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
  }).format(amount)

export default function CheckoutPage() {
  const { cart, clearCart } = useCart()
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [address, setAddress] = useState('')

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) return
      setUser(data.user)

      // Fetch profile with address
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, address')
        .eq('id', data.user.id)
        .single()

      if (profile?.address) setAddress(profile.address)
    }
    getUser()
  }, [])

  const handleCheckout = async () => {
    if (!user) return alert('User not found')
    if (!address.trim()) return alert('Please enter your shipping address')

    const orderId = `ORDER-${Date.now()}`

    // Save/update address in profile
    await supabase
      .from('profiles')
      .update({ address })
      .eq('id', user.id)

    // Save order in DB with shipping address
    const { data: order } = await supabase.from('orders').insert({
      user_id: user.id,
      total_amount: total,
      status: 'pending',
      payment_id: orderId,
      shipping_address: address,
    }).select().single()

    // Save order items
    await supabase.from('order_items').insert(
      cart.map((item) => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        price_at_purchase: item.price,
      }))
    )

    // Request Midtrans token
    const response = await fetch('/api/create-transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        amount: total,
        items: cart.map((item) => ({
          id: item.id,
          price: item.price,
          quantity: item.quantity,
          name: item.name,
        })),
        customer: {
          name: user.email,
          email: user.email,
        },
      }),
    })

    const data = await response.json()

    // Open Snap popup
    window.snap.pay(data.token, {
      onSuccess: async function () {
        // Mark order as paid
        await supabase
          .from('orders')
          .update({ status: 'paid' })
          .eq('payment_id', orderId)

        // Reduce stock for each product
        for (const item of cart) {
          const { data: product } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.id)
            .single()

          if (!product) continue

          const newStock = product.stock - item.quantity
          await supabase
            .from('products')
            .update({ stock: newStock < 0 ? 0 : newStock })
            .eq('id', item.id)
        }

        // Clear cart and redirect to home
        clearCart()
        router.push('/orders')
      },
      onPending: function () {
        alert('Waiting for payment...')
      },
      onError: function () {
        alert('Payment failed')
      },
      onClose: function () {
        alert('You closed the popup')
      },
    })
  }

  if (cart.length === 0)
    return <p className="p-10 text-yellow-400">Cart is empty.</p>

  return (
    <main className="min-h-screen bg-black p-8 text-yellow-400">
      <Script
        src="https://app.sandbox.midtrans.com/snap/snap.js"
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
      />

      {/* Header Row */}
      <div className="mb-8 flex items-center justify-between">
        <button
          onClick={() => router.push('/home')}
          className="rounded-md border border-yellow-400 px-4 py-2 text-sm font-semibold text-yellow-400 hover:bg-yellow-400 hover:text-black"
        >
          ← Back to Home
        </button>

        <h1 className="text-3xl font-bold">Checkout</h1>

        {/* Spacer to balance layout */}
        <div className="w-[120px]" />
      </div>

      {/* Address Input */}
      <div className="mb-6 max-w-xl mx-auto">
        <label className="block mb-2 font-semibold text-yellow-400">
          Shipping Address
        </label>
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter your shipping address"
          className="w-full rounded-md border border-yellow-400 bg-black px-4 py-2 text-yellow-400"
          rows={3}
        />
      </div>

      {/* Order Summary */}
      <div className="mx-auto max-w-xl">
        <div className="mb-6 space-y-3">
          {cart.map((item) => (
            <div key={item.id} className="flex justify-between">
              <span>
                {item.name} x {item.quantity}
              </span>
              <span>{formatIDR(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>

        <h2 className="mb-6 text-xl font-bold">
          Total: {formatIDR(total)}
        </h2>

        <button
          onClick={handleCheckout}
          className="w-full rounded-md bg-yellow-500 px-6 py-3 font-semibold text-black hover:bg-yellow-400"
        >
          Pay with Midtrans
        </button>
      </div>
    </main>
  )
}

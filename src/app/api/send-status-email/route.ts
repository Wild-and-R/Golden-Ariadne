// /app/api/send-status-email/route.ts
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase with Service Role key (server-side only!)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(req: Request) {
  try {
    const { orderId, status } = await req.json()

    if (!orderId || !status) {
      return NextResponse.json({ error: 'Missing orderId or status' }, { status: 400 })
    }

    // Fetch the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      console.error('Order not found', orderError)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Fetch user email from auth.users using Service Role
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(order.user_id)

    if (userError || !userData?.user?.email) {
      console.error('User email not found', userError)
      return NextResponse.json({ error: 'User email not found' }, { status: 404 })
    }

    const email = userData.user.email

    // Fetch order items
    const { data: items } = await supabase
      .from('order_items')
      .select(`
        quantity,
        price_at_purchase,
        products(name)
      `)
      .eq('order_id', orderId)

    const itemList = items
      ?.map(
        (item: any) =>
          `${item.products?.name ?? 'Item'} x ${item.quantity} — Rp ${(
            item.price_at_purchase * item.quantity
          ).toLocaleString('id-ID')}`
      )
      .join('<br/>')

    // Send the email via Resend
    await resend.emails.send({
      from: 'Golden Ariadne <onboarding@resend.dev>',
      to: email,
      subject: `Order ${order.payment_id} is now ${status}`,
      html: `
        <h2>Order Status Update</h2>
        <p>Your order <strong>${order.payment_id}</strong> is now:</p>
        <h3 style="color:${
          status === 'delivered'
            ? 'green'
            : status === 'shipped'
            ? 'blue'
            : 'black'
        }">
          ${status.toUpperCase()}
        </h3>
        <p><strong>Shipping Address:</strong><br/>${order.shipping_address}</p>
        <h3>Order Details:</h3>
        <p>${itemList ?? ''}</p>
        <h3>Total: Rp ${order.total_amount.toLocaleString('id-ID')}</h3>
        <br/>
        <p>Thank you for shopping with Golden Ariadne</p>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Send status email error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

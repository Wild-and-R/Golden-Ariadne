import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json()

    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing orderId' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // service role required
    )

    // Get order with items
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          quantity,
          price_at_purchase,
          product_id,
          products(name)
        )
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Get user email
    const { data: userData } =
      await supabase.auth.admin.getUserById(order.user_id)

    const email = userData?.user?.email
    if (!email) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 404 }
      )
    }

    // Refund via Midtrans
    const refundResponse = await fetch(
      `https://api.sandbox.midtrans.com/v2/${order.payment_id}/refund`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:
            'Basic ' +
            Buffer.from(
              process.env.MIDTRANS_SERVER_KEY + ':'
            ).toString('base64'),
        },
        body: JSON.stringify({
          refund_key: `refund-${Date.now()}`,
          amount: order.total_amount,
        }),
      }
    )

    if (!refundResponse.ok) {
      const err = await refundResponse.text()
      console.error('Midtrans refund error:', err)
      return NextResponse.json(
        { error: 'Refund failed' },
        { status: 500 }
      )
    }

    // Restore stock
    for (const item of order.order_items) {
      const { data: product } = await supabase
        .from('products')
        .select('stock')
        .eq('id', item.product_id)
        .single()

      if (!product) continue

      await supabase
        .from('products')
        .update({
          stock: product.stock + item.quantity,
        })
        .eq('id', item.product_id)
    }

    // Send refund email
    const itemList = order.order_items
      .map(
        (item: any) =>
          `${item.products?.name ?? 'Item'} x ${item.quantity} — Rp ${(
            item.price_at_purchase * item.quantity
          ).toLocaleString('id-ID')}`
      )
      .join('<br/>')

    await resend.emails.send({
      from: 'Golden Ariadne <onboarding@resend.dev>',
      to: email,
      subject: `Refund Processed - ${order.payment_id}`,
      html: `
        <h2>Your Order Has Been Cancelled</h2>
        <p><strong>Order ID:</strong> ${order.payment_id}</p>
        <p>Status: <strong style="color:red;">CANCELLED & REFUNDED</strong></p>

        <h3>Refund Amount:</h3>
        <p>Rp ${order.total_amount.toLocaleString('id-ID')}</p>

        <h3>Order Details:</h3>
        <p>${itemList}</p>

        <br/>
        <p>The refund has been processed via Midtrans.</p>
        <p>Please allow a few minutes for the payment provider to complete the refund.</p>

        <br/>
        <p>We hope to serve you again.</p>
        <p>— Golden Ariadne</p>
      `,
    })

    // Delete order items
    await supabase
      .from('order_items')
      .delete()
      .eq('order_id', orderId)

    // Delete order
    await supabase.from('orders').delete().eq('id', orderId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cancel order error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}

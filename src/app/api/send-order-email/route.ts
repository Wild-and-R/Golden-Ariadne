import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  try {
    const { email, orderId, items, total, address } = await req.json()

    const itemList = items
      .map(
        (item: any) =>
          `${item.name} x ${item.quantity} - Rp ${(
            item.price * item.quantity
          ).toLocaleString('id-ID')}`
      )
      .join('<br/>')

    await resend.emails.send({
      from: 'Golden Ariadne <onboarding@resend.dev>', // change to verified domain later
      to: email,
      subject: `Order Confirmation - ${orderId}`,
      html: `
        <h2>Thank you for your purchase!</h2>
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Status:</strong> Paid</p>
        <p><strong>Shipping Address:</strong><br/>${address}</p>

        <h3>Order Details:</h3>
        <p>${itemList}</p>

        <h3>Total: Rp ${total.toLocaleString('id-ID')}</h3>

        <br/>
        <p>We will notify you when your order is shipped.</p>
        <p>— Golden Ariadne</p>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}

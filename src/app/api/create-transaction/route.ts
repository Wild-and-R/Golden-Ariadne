import { NextResponse } from 'next/server'
import midtransClient from 'midtrans-client'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { orderId, amount, items, customer } = body

    const snap = new midtransClient.Snap({
      isProduction: false,
      serverKey: process.env.MIDTRANS_SERVER_KEY!,
      clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY!,
    })

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      item_details: items,
      customer_details: {
        first_name: customer.name,
        email: customer.email,
      },
    }

    const transaction = await snap.createTransaction(parameter)

    return NextResponse.json({
      token: transaction.token,
      redirect_url: transaction.redirect_url,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Transaction failed' }, { status: 500 })
  }
}

'use client'

import { useCart } from '@/store/useCart'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

interface Product {
  id: string
  name: string
  price: number
  description: string
  stock: number
  image_url: string | null
}

const formatIDR = (amount: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)

export default function Home() {
  const { cart, addToCart, removeFromCart, clearCart } = useCart()
  const supabase = createClient()
  const router = useRouter()

  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [userName, setUserName] = useState<string | null>(null)
  const [role, setRole] = useState<string>('user')

  const [addingId, setAddingId] = useState<string | null>(null)

  // Admin form state
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newStock, setNewStock] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single()

      setUserName(profile?.full_name ?? user.email)
      setRole(profile?.role ?? 'user')

      fetchProducts()
    }

    init()
  }, [])

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setProducts(data)
  }

  const handleAddProduct = async () => {
    if (!newName || !newPrice) return

    let imageUrl: string | null = null

    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, imageFile)

      if (uploadError) {
        alert(uploadError.message)
        return
      }

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName)

      imageUrl = data.publicUrl
    }

    await supabase.from('products').insert({
      name: newName,
      price: Number(newPrice),
      description: newDesc,
      stock: Number(newStock),
      image_url: imageUrl,
    })

    setNewName('')
    setNewPrice('')
    setNewDesc('')
    setNewStock('')
    setImageFile(null)

    fetchProducts()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Add to cart handler with visual feedback
  const handleAddToCart = (product: Product) => {
    setAddingId(product.id)
    addToCart({ ...product, quantity: 1 })
    setTimeout(() => setAddingId(null), 1000)
  }

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase())
  )

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )

  return (
    <main className="min-h-screen bg-black p-8 text-yellow-400">
      {/* HEADER */}
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Golden Ariadne</h1>
          <p className="text-base text-yellow-400">
            Welcome{userName ? `, ${userName}` : ''}
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="rounded-md border border-yellow-500 px-4 py-2 font-semibold hover:bg-yellow-400 hover:text-black"
        >
          Logout
        </button>
      </div>

      {/* SEARCH */}
      <div className="mb-8">
        <input
          type="text"
          placeholder="Search jewelry..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-yellow-400 bg-black px-4 py-3"
        />
      </div>

      {/* ADMIN DASHBOARD */}
      {role === 'admin' && (
        <section className="mb-12 rounded-lg border border-yellow-500 p-6">
          <h2 className="mb-4 text-2xl font-semibold">
            Admin Dashboard — Add Product
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              placeholder="Product Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="rounded-md border border-yellow-400 bg-black px-4 py-2"
            />

            <input
              placeholder="Price"
              type="number"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              className="rounded-md border border-yellow-400 bg-black px-4 py-2"
            />

            <input
              placeholder="Stock"
              type="number"
              value={newStock}
              onChange={(e) => setNewStock(e.target.value)}
              className="rounded-md border border-yellow-400 bg-black px-4 py-2"
            />

            <input
              placeholder="Description"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="rounded-md border border-yellow-400 bg-black px-4 py-2"
            />

            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setImageFile(e.target.files ? e.target.files[0] : null)
              }
              className="rounded-md border border-yellow-400 bg-black px-4 py-2"
            />
          </div>

          <button
            onClick={handleAddProduct}
            className="mt-4 rounded-md bg-yellow-500 px-6 py-2 font-semibold text-black hover:bg-yellow-400"
          >
            Add Product
          </button>
        </section>
      )}

      {/* PRODUCT GRID */}
      <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="rounded-lg border border-yellow-400 p-6"
          >
            {/* Product Image */}
            {product.image_url && (
              <img
                src={product.image_url}
                alt={product.name}
                className="mb-4 h-48 w-full rounded-md object-cover"
              />
            )}

            {/* Name & Description */}
            <h2 className="mb-2 text-xl font-semibold">{product.name}</h2>
            <p className="mb-3 text-base text-yellow-400 leading-relaxed">
              {product.description}
            </p>

            {/* Price */}
            <p className="mb-2 font-bold text-yellow-400">{formatIDR(product.price)}</p>

            {/* Stock */}
            <p className={`mb-4 text-sm font-medium ${product.stock === 0 ? 'text-red-500' : 'text-yellow-300'}`}>
              {product.stock === 0 ? 'Out of Stock' : `Stock: ${product.stock}`}
            </p>

            {/* Add to Cart */}
            <button
              disabled={addingId === product.id || product.stock === 0}
              onClick={() => handleAddToCart(product)}
              className="w-full rounded-md border border-yellow-400 bg-black px-4 py-2 font-semibold text-yellow-400 transition hover:bg-yellow-400 hover:text-black disabled:opacity-60"
            >
              {product.stock === 0
                ? 'Out of Stock'
                : addingId === product.id
                ? 'Added!'
                : 'Add to Cart'}
            </button>
          </div>
        ))}
      </div>

      {/* CART SUMMARY */}
      <section className="mt-12 rounded-lg border border-yellow-400 bg-black p-6 shadow-lg">
        <h3 className="mb-4 text-2xl font-semibold text-yellow-400">
          Your Cart ({cart.length} {cart.length === 1 ? 'item' : 'items'})
        </h3>

        {cart.length === 0 ? (
          <p className="text-yellow-400">Your cart is empty.</p>
        ) : (
          <>
            <ul className="mb-4 space-y-3">
              {cart.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-md border border-yellow-400 bg-black px-4 py-2"
                >
                  <div>
                    <p className="font-semibold text-yellow-400">{item.name}</p>
                    <p className="text-base leading-relaxed text-yellow-400">
                      {formatIDR(item.price)} x {item.quantity}
                    </p>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-red-600 hover:text-red-400"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>

            <p className="mb-4 text-right text-xl font-bold text-yellow-400">
              Total: {formatIDR(cartTotal)}
            </p>

            <button
              onClick={() => clearCart()}
              className="rounded-md bg-yellow-500 px-5 py-2 font-semibold text-black transition hover:bg-yellow-400"
            >
              Clear Cart
            </button>
          </>
        )}
      </section>
    </main>
  )
}

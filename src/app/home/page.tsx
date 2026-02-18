'use client'

import { useCart } from '@/store/useCart'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

interface Product {
  id: string
  name: string
  price: number
  description: string
  stock: number
  image_url: string | null
  category: string
}

const formatIDR = (amount: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)

export default function Home() {
  const {
  cart,
  setCart,
  addToCart,
  clearCart,
  increaseQuantity,
  decreaseQuantity,
} = useCart()


  const supabase = createClient()
  const router = useRouter()

  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [userName, setUserName] = useState<string | null>(null)
  const [role, setRole] = useState<string>('user')

  const [addingId, setAddingId] = useState<string | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const formRef = useRef<HTMLDivElement>(null)

  const [isCartOpen, setIsCartOpen] = useState(false)

  // Admin form state
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newStock, setNewStock] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [newCategory, setNewCategory] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  useEffect(() => {
    const init = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    router.push('/login')
    return
  }

  // Load cart for this user
  const storedCart = localStorage.getItem(
    `golden-ariadne-cart-${user.id}`
  )

  if (storedCart) {
    setCart(JSON.parse(storedCart))
  } else {
    setCart([])
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

useEffect(() => {
  // Subscribe to real-time changes on 'products'
  const subscription = supabase
    .channel('public:products')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'products' },
      (payload) => {
        console.log('Realtime product change:', payload)
        fetchProducts() // refetch products whenever a change happens
      }
    )
    .subscribe()

  // Cleanup on unmount
  return () => {
    supabase.removeChannel(subscription)
  }
}, [])

useEffect(() => {
  const saveCart = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    localStorage.setItem(
      `golden-ariadne-cart-${user.id}`,
      JSON.stringify(cart)
    )
  }

  if (cart.length >= 0) {
    saveCart()
  }
}, [cart])

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setProducts(data)
  }

  const resetForm = () => {
  setNewName('')
  setNewPrice('')
  setNewDesc('')
  setNewStock('')
  setNewCategory('')
  setImageFile(null)
  setEditingProduct(null)
}

  const handleSaveProduct = async () => {
  if (!newName || !newPrice) return

  let imageUrl: string | null = editingProduct?.image_url ?? null

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

  if (editingProduct) {
    await supabase
      .from('products')
      .update({
        name: newName,
        price: Number(newPrice),
        description: newDesc,
        stock: Number(newStock),
        category: newCategory,
        image_url: imageUrl,
      })
      .eq('id', editingProduct.id)
  } else {
    await supabase.from('products').insert({
      name: newName,
      price: Number(newPrice),
      description: newDesc,
      stock: Number(newStock),
      category: newCategory || 'Uncategorized',
      image_url: imageUrl,
    })
  }

  resetForm()
  fetchProducts()
}

  const handleEdit = (product: Product) => {
  setEditingProduct(product)
  setNewName(product.name)
  setNewPrice(product.price.toString())
  setNewDesc(product.description)
  setNewStock(product.stock.toString())
  setNewCategory(product.category)

  // Scroll form into view
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const handleDelete = async (id: string) => {
  if (!confirm('Are you sure you want to delete this product?')) return

  await supabase.from('products').delete().eq('id', id)
  fetchProducts()
}

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  // Add to cart handler with visual feedback
  const handleAddToCart = (product: Product) => {
  setAddingId(product.id)

  addToCart({
    id: product.id,
    name: product.name,
    price: product.price,
    stock: product.stock,
    quantity: 1,
  })

  setIsCartOpen(true) // open dialog
  setTimeout(() => setAddingId(null), 1000)
}

  const categories = [
  'All',
  ...Array.from(new Set(products.map((p) => p.category)))
]
  const filteredProducts = products.filter((product) => {
  const matchesSearch = product.name
    .toLowerCase()
    .includes(search.toLowerCase())

  const matchesCategory =
    selectedCategory === 'All' ||
    product.category === selectedCategory

  return matchesSearch && matchesCategory
})


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
        <div className="flex items-center">
          {role !== 'admin' && (
            <button
              onClick={() => setIsCartOpen(true)}
              className="ml-4 rounded-md border border-yellow-400 px-4 py-2 font-semibold text-yellow-400 hover:bg-yellow-400 hover:text-black"
            >
              Cart ({cart.length})
            </button>
          )}

          <button
            onClick={() =>
              router.push(role === 'admin' ? '/admin/orders' : '/orders')
            }
            className="ml-4 rounded-md border border-yellow-400 px-4 py-2 font-semibold text-yellow-400 hover:bg-yellow-400 hover:text-black"
          >
            {role === 'admin' ? 'Manage Orders' : 'My Orders'}
          </button>

          <button
            onClick={handleLogout}
            className="ml-4 rounded-md border border-yellow-500 px-4 py-2 font-semibold hover:bg-yellow-400 hover:text-black"
          >
            Logout
          </button>
        </div>
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
        <div className="mt-4">
  <select
    value={selectedCategory}
    onChange={(e) => setSelectedCategory(e.target.value)}
    className="w-full rounded-md border border-yellow-400 bg-black px-4 py-3 text-yellow-400"
  >
    {categories.map((cat) => (
      <option key={cat} value={cat} className="bg-black text-yellow-400">
        {cat}
      </option>
    ))}
  </select>
</div>
      </div>

      {/* ADMIN DASHBOARD */}
      {role === 'admin' && (
  <section
    ref={formRef}
    className="mb-16 rounded-2xl border border-yellow-500/40 bg-gradient-to-br from-black via-neutral-900 to-black p-8 shadow-2xl"
  >
    {/* Header */}
    <div className="mb-8 flex items-center justify-between">
      <div>
        <h2 className="text-3xl font-bold text-yellow-400">
          {editingProduct ? 'Edit Product' : 'Add New Product'}
        </h2>
        <p className="text-sm text-yellow-300/70">
          Manage your jewelry collection
        </p>
      </div>

      {editingProduct && (
        <span className="rounded-full bg-yellow-500/20 px-4 py-1 text-xs font-semibold text-yellow-400 border border-yellow-500/40">
          Editing Mode
        </span>
      )}
    </div>

    {/* Form Grid */}
    <div className="grid gap-6 md:grid-cols-2">

      {/* Product Name */}
      <div className="flex flex-col">
        <label className="mb-1 text-sm text-yellow-300">Product Name</label>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="rounded-lg border border-yellow-500/40 bg-black px-4 py-3 focus:border-yellow-400 focus:outline-none"
        />
      </div>

      {/* Price */}
      <div className="flex flex-col">
        <label className="mb-1 text-sm text-yellow-300">Price (IDR)</label>
        <input
          type="number"
          value={newPrice}
          onChange={(e) => setNewPrice(e.target.value)}
          className="rounded-lg border border-yellow-500/40 bg-black px-4 py-3 focus:border-yellow-400 focus:outline-none"
        />
      </div>

      {/* Stock */}
      <div className="flex flex-col">
        <label className="mb-1 text-sm text-yellow-300">Stock</label>
        <input
          type="number"
          value={newStock}
          onChange={(e) => setNewStock(e.target.value)}
          className="rounded-lg border border-yellow-500/40 bg-black px-4 py-3 focus:border-yellow-400 focus:outline-none"
        />
      </div>

      {/* Category */}
      <div className="flex flex-col">
        <label className="mb-1 text-sm text-yellow-300">Category</label>
        <input
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          className="rounded-lg border border-yellow-500/40 bg-black px-4 py-3 focus:border-yellow-400 focus:outline-none"
        />
      </div>

      {/* Description */}
      <div className="flex flex-col md:col-span-2">
        <label className="mb-1 text-sm text-yellow-300">Description</label>
        <textarea
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          rows={4}
          className="rounded-lg border border-yellow-500/40 bg-black px-4 py-3 focus:border-yellow-400 focus:outline-none"
        />
      </div>

      {/* Image Upload */}
      <div className="flex flex-col md:col-span-2">
        <div className="md:col-span-2">
  <label className="mb-2 block text-sm text-yellow-300">
    Product Image
  </label>

  {/* Hidden Input */}
  <input
    type="file"
    accept="image/*"
    id="imageUpload"
    className="hidden"
    onChange={(e) =>
      setImageFile(e.target.files ? e.target.files[0] : null)
    }
  />

  {/* Custom Upload Box */}
  <label
    htmlFor="imageUpload"
    className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-yellow-500/40 bg-black/60 p-8 text-center transition hover:border-yellow-400 hover:bg-yellow-500/5"
  >
    {!imageFile && !editingProduct?.image_url && (
      <>
        <span className="text-lg font-semibold text-yellow-400">
          Click to Upload Image
        </span>
        <span className="mt-2 text-sm text-yellow-300/60">
          PNG, JPG up to 5MB
        </span>
      </>
    )}

    {(imageFile || editingProduct?.image_url) && (
      <div className="w-full">
        <img
          src={
            imageFile
              ? URL.createObjectURL(imageFile)
              : editingProduct?.image_url || ''
          }
          alt="Preview"
          className="mx-auto h-48 w-full rounded-lg object-cover border border-yellow-500/30"
        />

        <p className="mt-4 text-sm text-yellow-300">
          {imageFile ? imageFile.name : 'Current Image'}
        </p>

        <p className="mt-1 text-xs text-yellow-400 underline">
          Click to change image
        </p>
      </div>
    )}
  </label>
</div>

        {/* Image Preview */}
        {(imageFile || editingProduct?.image_url) && (
          <img
            src={
              imageFile
                ? URL.createObjectURL(imageFile)
                : editingProduct?.image_url || ''
            }
            alt="Preview"
            className="mt-4 h-40 w-full rounded-lg object-cover border border-yellow-500/30"
          />
        )}
      </div>
    </div>

    {/* Buttons */}
    <div className="mt-8 flex justify-end gap-4">
      {editingProduct && (
        <button
          onClick={resetForm}
          className="rounded-lg border border-gray-500 px-6 py-2 text-gray-300 hover:bg-gray-700"
        >
          Cancel
        </button>
      )}

      <button
        onClick={handleSaveProduct}
        className="rounded-lg bg-yellow-500 px-8 py-3 font-semibold text-black transition hover:bg-yellow-400 shadow-lg"
      >
        {editingProduct ? 'Update Product' : 'Add Product'}
      </button>
    </div>
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

            {/* Name, Description & Category */}
            <h2 className="mb-2 text-xl font-semibold">{product.name}</h2>
            <p className="mb-3 text-base text-yellow-400 leading-relaxed">
              {product.description}
            </p>
            <p className="mb-2 text-sm italic text-yellow-300">
              Category: {product.category}
            </p>
            {/* Price */}
            <p className="mb-2 font-bold text-yellow-400">{formatIDR(product.price)}</p>

            {/* Stock */}
            <p className={`mb-4 text-sm font-medium ${product.stock === 0 ? 'text-red-500' : 'text-yellow-300'}`}>
              {product.stock === 0 ? 'Out of Stock' : `Stock: ${product.stock}`}
            </p>

            {/* Add to Cart */}
            {role !== 'admin' && (
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
            )}
            {/* Edit & Delete */}
            {role === 'admin' && (
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => handleEdit(product)}
              className="w-full rounded-md border border-blue-400 px-3 py-1 text-sm text-blue-400 hover:bg-blue-400 hover:text-black"
            >
              Edit
            </button>

            <button
              onClick={() => handleDelete(product.id)}
              className="w-full rounded-md border border-red-500 px-3 py-1 text-sm text-red-500 hover:bg-red-500 hover:text-black"
            >
              Delete
            </button>
          </div>
        )}
          </div>
        ))}
      </div>

      {/* CART SUMMARY */}
      {isCartOpen && role !== 'admin' && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
    <div className="w-full max-w-lg rounded-lg border border-yellow-400 bg-black p-6 shadow-lg">

      {/* Header */}
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-2xl font-semibold text-yellow-400">
          Your Cart ({cart.length})
        </h3>
        <button
          onClick={() => setIsCartOpen(false)}
          className="text-yellow-400 hover:text-red-400"
        >
          ✕
        </button>
      </div>

      {cart.length === 0 ? (
        <p className="text-yellow-400">Your cart is empty.</p>
      ) : (
        <>
          <ul className="mb-4 space-y-3 max-h-64 overflow-y-auto">
            {cart.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-md border border-yellow-400 px-4 py-2"
              >
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p>
                    {formatIDR(item.price)} x {item.quantity}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => decreaseQuantity(item.id)}
                    className="border border-yellow-400 px-2"
                  >
                    −
                  </button>

                  <span>{item.quantity}</span>

                  <button
                    onClick={() => increaseQuantity(item.id)}
                    disabled={item.quantity >= item.stock}
                    className="border border-yellow-400 px-2 disabled:opacity-50"
                  >
                    +
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <p className="mb-4 text-right font-bold">
            Total:{' '}
            {formatIDR(
              cart.reduce(
                (sum, item) =>
                  sum + item.price * item.quantity,
                0
              )
            )}
          </p>

          <div className="flex justify-between">
            <button
              onClick={clearCart}
              className="rounded-md bg-yellow-500 px-4 py-2 font-semibold text-black"
            >
              Clear
            </button>

            <button
              onClick={() => {
                setIsCartOpen(false)
                router.push('/checkout')
              }}
              className="rounded-md border border-yellow-400 px-4 py-2 text-yellow-400 hover:bg-yellow-400 hover:text-black"
            >
              Checkout
            </button>
          </div>
        </>
      )}
    </div>
  </div>
)}
    </main>
  )
}

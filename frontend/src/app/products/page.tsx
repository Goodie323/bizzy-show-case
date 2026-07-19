"use client"

import { useEffect, useState } from "react"
import { Shell } from "@/components/layout/shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Pagination } from "@/components/ui/pagination"
import { formatNaira } from "@/lib/utils"
import { useNotificationContext } from "@/components/notifications/NotificationProvider"
import { Plus, Pencil, Trash2, Package, Loader2, Search, ImageIcon, TrendingDown, Sparkles } from "lucide-react"
import { getProducts, Product, createProduct, updateProduct, deleteProduct } from "@/lib/api"

function ProductAvatar({ name, imageUrl }: { name: string; imageUrl?: string }) {
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
  const colors = ["bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500"]
  const color = colors[name.length % colors.length]

  if (imageUrl) {
    return (
      <img src={imageUrl} alt={name} className="h-11 w-11 rounded-xl object-cover shadow-sm ring-2 ring-background" />
    )
  }
  return (
    <div className={`h-11 w-11 rounded-xl ${color} flex items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-background`}>
      {initials}
    </div>
  )
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filtered, setFiltered] = useState<Product[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: "", variant: "none", price: "", min_floor_price: "", stock_quantity: "", is_available: true, image_url: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const { addNotification } = useNotificationContext()

  const loadProducts = () => {
    setLoading(true)
    getProducts()
      .then((data) => {
        setProducts(data)
        setFiltered(data)
        setLoading(false)
      })
      .catch((err: any) => {
        setLoading(false)
        addNotification({
          title: "Failed to load products",
          message: err.message || "Could not fetch inventory",
          type: "error",
        })
      })
  }

  useEffect(() => { loadProducts() }, [])

  useEffect(() => {
    const term = search.toLowerCase()
    setFiltered(products.filter(p =>
      p.name.toLowerCase().includes(term) || p.variant.toLowerCase().includes(term)
    ))
    setCurrentPage(1)
  }, [search, products])

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginatedProducts = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const openCreate = () => {
    setEditingProduct(null)
    setFormData({ name: "", variant: "none", price: "", min_floor_price: "", stock_quantity: "", is_available: true, image_url: "" })
    setDialogOpen(true)
  }

  const openEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      variant: product.variant || "none",
      price: String(product.price),
      min_floor_price: String(product.min_floor_price),
      stock_quantity: String(product.stock_quantity),
      is_available: product.is_available ?? true,
      image_url: product.image_url || "",  // ← add this
  })
  setDialogOpen(true)
}

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const payload = {
      name: formData.name, variant: formData.variant,
      price: parseFloat(formData.price), min_floor_price: parseFloat(formData.min_floor_price),
      stock_quantity: parseInt(formData.stock_quantity), is_available: formData.is_available,
      ...(formData.image_url && { image_url: formData.image_url }),
    }
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, payload)
        addNotification({
          title: "Product updated!",
          message: `${formData.name} has been updated`,
          type: "success",
        })
      } else {
        await createProduct(payload)
        addNotification({
          title: "Product created!",
          message: `${formData.name} added to inventory`,
          type: "success",
        })
      }
      setDialogOpen(false)
      loadProducts()
    } catch (err: any) {
      addNotification({
        title: editingProduct ? "Update failed" : "Create failed",
        message: err.message || "Something went wrong",
        type: "error",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this product?")) return
    setDeletingId(id)
    try {
      await deleteProduct(id)
      addNotification({
        title: "Product deleted",
        message: "Removed from inventory",
        type: "info",
      })
      loadProducts()
    } catch (err: any) {
      addNotification({
        title: "Delete failed",
        message: err.message || "Could not delete product",
        type: "error",
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" />
              Products
            </h1>
            <p className="text-muted-foreground">Manage your inventory catalog</p>
          </div>
          <Button onClick={openCreate} className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow rounded-xl">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>

        <div className="relative max-w-md animate-fade-in stagger-1" style={{ animationFillMode: "forwards", opacity: 0 }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products by name or variant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 rounded-xl border-muted-foreground/20 focus-visible:ring-primary/30"
          />
        </div>

        <Card className="overflow-hidden animate-fade-in stagger-2" style={{ animationFillMode: "forwards", opacity: 0 }}>
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              <span>Inventory ({filtered.length} {filtered.length === 1 ? "product" : "products"})</span>
              {search && (
                <Badge variant="secondary" className="cursor-pointer hover:bg-muted" onClick={() => setSearch("")}>
                  Clear filter ×
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-11 w-11 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground animate-fade-in">
                <div className="rounded-2xl bg-muted p-4 mb-4">
                  <Package className="h-10 w-10 opacity-40" />
                </div>
                <p className="font-medium">
                  {search ? "No products match your search." : "No products yet."}
                </p>
                <p className="text-sm mt-1">{search ? "Try a different search term." : "Add your first product to get started."}</p>
                {!search && (
                  <Button onClick={openCreate} variant="outline" className="mt-4 rounded-xl">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Add First Product
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/20 text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-6 py-3 font-medium">Product</th>
                      <th className="px-6 py-3 font-medium">Price</th>
                      <th className="px-6 py-3 font-medium hidden sm:table-cell">Min Price</th>
                      <th className="px-6 py-3 font-medium">Stock</th>
                      <th className="px-6 py-3 font-medium hidden md:table-cell">Status</th>
                      <th className="px-6 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {paginatedProducts.map((product, i) => (
                      <tr key={product.id} className="border-b last:border-0 table-row-animate group" style={{ animationDelay: `${i * 0.03}s` }}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <ProductAvatar name={product.name} imageUrl={product.image_url} />
                            <div>
                              <p className="font-medium group-hover:text-primary transition-colors">{product.name}</p>
                              <p className="text-xs text-muted-foreground">{product.variant}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold">{formatNaira(product.price)}</td>
                        <td className="px-6 py-4 text-muted-foreground hidden sm:table-cell">
                          <span className="flex items-center gap-1">
                            <TrendingDown className="h-3 w-3" />
                            {formatNaira(product.min_floor_price)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`font-semibold ${product.stock_quantity <= 3 ? "text-red-600" : ""}`}>
                            {product.stock_quantity}
                          </span>
                          {product.stock_quantity <= 3 && (
                            <Badge variant="outline" className="ml-2 text-[10px] bg-red-50 text-red-700 border-red-200 animate-pulse">
                              Low
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 hidden md:table-cell">
                          <Badge variant={product.is_available ? "default" : "secondary"} className={`rounded-full ${product.is_available ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" : ""}`}>
                            {product.is_available ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="sm" className="rounded-lg h-8 w-8 p-0" onClick={() => openEdit(product)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="rounded-lg h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(product.id)} disabled={deletingId === product.id}>
                              {deletingId === product.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length > itemsPerPage && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={filtered.length}
                    itemsPerPage={itemsPerPage}
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {editingProduct ? "Edit Product" : "Add Product"}
          </DialogTitle>
          <DialogDescription>
            {editingProduct ? "Update your product details" : "Add a new item to your catalog"}
          </DialogDescription>
        </DialogHeader>
        <DialogContent>
          <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="variant">Variant</Label>
              <Input id="variant" value={formData.variant} onChange={(e) => setFormData({ ...formData, variant: e.target.value })} className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (₦)</Label>
                <Input id="price" type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min_floor">Min Floor (₦)</Label>
                <Input id="min_floor" type="number" value={formData.min_floor_price} onChange={(e) => setFormData({ ...formData, min_floor_price: e.target.value })} required className="rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock">Stock Qty</Label>
                <Input id="stock" type="number" value={formData.stock_quantity} onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })} required className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select id="status" className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" value={String(formData.is_available)} onChange={(e) => setFormData({ ...formData, is_available: e.target.value === "true" })}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="image" className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Image URL (optional)
              </Label>
              <Input id="image" type="url" placeholder="https://..." value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} className="rounded-xl" />
            </div>
          </form>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancel</Button>
          <Button type="submit" form="product-form" disabled={submitting} className="rounded-xl shadow-lg shadow-primary/20">
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editingProduct ? "Update Product" : "Create Product"}
          </Button>
        </DialogFooter>
      </Dialog>
    </Shell>
  )
}
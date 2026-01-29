
import DashboardLayout from "@/components/dashboard-layout"
import ProductsTable from "@/components/products-table"

export default function ProdutosPage() {
  return (
    <DashboardLayout hideFloatingMenu={true}>
      <div className="flex flex-col h-full bg-background overflow-hidden scrollbar-hide">
        {/* Header - Desktop */}
        <div className="hidden md:block border-b p-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
          <p className="text-muted-foreground">
            Consulte o catálogo de produtos, preços e disponibilidade de estoque
          </p>
        </div>

        {/* Header - Mobile */}
        <div className="md:hidden border-b px-3 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <h1 className="text-lg font-bold">Produtos</h1>
          <p className="text-xs text-muted-foreground">
            Catálogo de produtos e estoque
          </p>
        </div>

        <div className="flex-1 overflow-hidden">
          <ProductsTable />
        </div>
      </div>
    </DashboardLayout>
  )
}

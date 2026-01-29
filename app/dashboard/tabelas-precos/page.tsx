"use client"

import DashboardLayout from "@/components/dashboard-layout"
import TabelasPrecosView from "@/components/tabelas-precos-view"

export default function TabelasPrecosPage() {
  return (
    <DashboardLayout hideFloatingMenu={true}>
      <div className="flex flex-col h-full bg-background overflow-hidden scrollbar-hide">
        {/* Header - Desktop */}
        <div className="hidden md:block border-b p-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <h1 className="text-3xl font-bold tracking-tight">Tabela de Preços</h1>
          <p className="text-muted-foreground">
            Consulta de tabelas e preços de produtos sincronizados
          </p>
        </div>

        {/* Header - Mobile */}
        <div className="md:hidden border-b px-3 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <h1 className="text-lg font-bold">Tabela de Preços</h1>
          <p className="text-xs text-muted-foreground">
            Consulta de tabelas e preços
          </p>
        </div>

        <div className="flex-1 overflow-hidden">
          <TabelasPrecosView />
        </div>
      </div>
    </DashboardLayout>
  )
}

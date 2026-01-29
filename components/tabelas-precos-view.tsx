"use client"

import { useState, useEffect } from "react"
import { Search, ChevronRight, Table, Package, DollarSign, ArrowLeft, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { OfflineDataService } from "@/lib/offline-data-service"
import { toast } from "sonner"

export default function TabelasPrecosView() {
  const [tabelas, setTabelas] = useState<any[]>([])
  const [parceirosMap, setParceirosMap] = useState<Record<number, any[]>>({})
  const [tabelaSelecionada, setTabelaSelecionada] = useState<any>(null)
  const [precos, setPrecos] = useState<any[]>([])
  const [produtosMap, setProdutosMap] = useState<Record<number, any>>({})
  const [loading, setLoading] = useState(true)
  const [buscaTabela, setBuscaTabela] = useState("")
  const [buscaPreco, setBuscaPreco] = useState("")

  useEffect(() => {
    carregarDadosIniciais()
  }, [])

  const carregarDadosIniciais = async () => {
    setLoading(true)
    try {
      const [tabelasData, produtosData, parceirosData] = await Promise.all([
        OfflineDataService.getTabelasPrecos(),
        OfflineDataService.getProdutos(),
        OfflineDataService.getParceiros()
      ])
      
      setTabelas(tabelasData)
      
      const pMap: Record<number, any> = {}
      produtosData.forEach((p: any) => {
        const cod = Number(p.CODPROD)
        if (!isNaN(cod)) {
          pMap[cod] = p
        }
      })
      setProdutosMap(pMap)

      // Mapear parceiros por CODTAB
      const parcMap: Record<number, any[]> = {}
      console.log("DEBUG: Iniciando mapeamento. Total parceiros:", parceirosData.length)
      parceirosData.forEach((parc: any) => {
        // Log para os primeiros parceiros para ver a estrutura
        const codTab = Number(parc.CODTAB)
        if (!isNaN(codTab) && codTab > 0) {
          if (!parcMap[codTab]) parcMap[codTab] = []
          parcMap[codTab].push(parc)
        }
      })
      console.log("DEBUG: Mapeamento concluído. Chaves no mapa:", Object.keys(parcMap))
      setParceirosMap(parcMap)
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
      toast.error("Erro ao carregar informações")
    } finally {
      setLoading(false)
    }
  }

  const selecionarTabela = async (tabela: any) => {
    setTabelaSelecionada(tabela)
    setLoading(true)
    try {
      const allPrecos = await OfflineDataService.getExcecoesPrecos()
      const precosFiltrados = allPrecos.filter((p: any) => Number(p.NUTAB) === Number(tabela.NUTAB))
      setPrecos(precosFiltrados)
    } catch (error) {
      console.error("Erro ao carregar preços:", error)
      toast.error("Erro ao carregar preços da tabela")
    } finally {
      setLoading(false)
    }
  }

  const tabelasFiltradas = tabelas.filter(t => 
    String(t.CODTAB).includes(buscaTabela) || 
    (t.DESCRICAO && t.DESCRICAO.toLowerCase().includes(buscaTabela.toLowerCase()))
  )

  const precosFiltrados = precos.filter(p => {
    const produto = produtosMap[Number(p.CODPROD)]
    const termo = buscaPreco.toLowerCase()
    return String(p.CODPROD).includes(termo) || 
           (produto?.DESCRPROD && produto.DESCRPROD.toLowerCase().includes(termo))
  })

  if (tabelaSelecionada) {
    return (
      <div className="h-full flex flex-col bg-background overflow-hidden scrollbar-hide">
        <div className="flex-shrink-0 p-3 md:p-6 border-b bg-white flex items-center justify-between shadow-sm sticky top-0 z-10">
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => setTabelaSelecionada(null)} className="h-8 w-8 md:h-10 md:w-10">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-0">
              <h2 className="text-sm md:text-xl font-bold truncate">Tabela: {tabelaSelecionada.CODTAB}</h2>
              <p className="text-[9px] md:text-sm text-muted-foreground truncate">{tabelaSelecionada.DESCRICAO || 'Detalhes dos Preços'}</p>
            </div>
          </div>
          <div className="hidden md:block relative w-64 lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar produto..." 
              value={buscaPreco}
              onChange={(e) => setBuscaPreco(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Barra de Busca Mobile */}
        <div className="md:hidden p-3 border-b bg-slate-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar produto ou código..." 
              value={buscaPreco}
              onChange={(e) => setBuscaPreco(e.target.value)}
              className="pl-9 h-10 bg-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
              <p className="text-sm text-muted-foreground">Carregando itens...</p>
            </div>
          ) : (
            <div className="p-0 md:p-6">
              <div className="bg-white md:rounded-xl md:border md:shadow-sm overflow-hidden">
                {/* Tabela Desktop */}
                <div className="hidden md:block">
                  <UITable>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="w-32 font-bold">Cód. Prod</TableHead>
                        <TableHead className="font-bold">Descrição do Produto</TableHead>
                        <TableHead className="text-right font-bold w-40">Preço de Venda</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {precosFiltrados.length > 0 ? (
                        precosFiltrados.map((p, idx) => {
                          const produto = produtosMap[Number(p.CODPROD)]
                          return (
                            <TableRow key={idx} className="hover:bg-slate-50/50">
                              <TableCell className="font-mono text-xs">{p.CODPROD}</TableCell>
                              <TableCell className="font-medium">{produto?.DESCRPROD || 'Produto não encontrado'}</TableCell>
                              <TableCell className="text-right font-bold text-green-600 text-lg">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.VLRVENDA)}
                              </TableCell>
                            </TableRow>
                          )
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-20 text-muted-foreground">
                            Nenhum preço encontrado nesta tabela.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </UITable>
                </div>

                {/* Lista Mobile */}
                <div className="md:hidden divide-y divide-slate-100">
                  {precosFiltrados.length > 0 ? (
                    precosFiltrados.map((p, idx) => {
                      const produto = produtosMap[Number(p.CODPROD)]
                      return (
                        <div key={idx} className="p-4 flex items-center justify-between gap-4 active:bg-slate-50 transition-colors">
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-mono font-bold">
                                #{p.CODPROD}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-slate-800 line-clamp-2 leading-snug">
                              {produto?.DESCRPROD || 'Produto não encontrado'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter opacity-70">Preço</p>
                            <p className="text-base font-black text-green-600 whitespace-nowrap">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.VLRVENDA)}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-2">
                      <Package className="w-10 h-10 opacity-20" />
                      <p className="text-sm font-medium">Nenhum preço encontrado.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar tabela..." 
              value={buscaTabela}
              onChange={(e) => setBuscaTabela(e.target.value)}
              className="pl-9 h-9 md:h-10 text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {tabelasFiltradas.map((tabela) => {
              const parceiros = parceirosMap[Number(tabela.CODTAB)] || []
              const parceiroPrincipal = parceiros[0]
              
              return (
              <Card 
                key={tabela.NUTAB} 
                className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-primary flex flex-col h-auto shadow-sm"
                onClick={() => selecionarTabela(tabela)}
              >
                <CardHeader className="p-3 md:p-6 pb-2 flex-1">
                  <div className="flex justify-between items-start gap-2">
                    <Badge variant="outline" className="font-mono text-[9px] md:text-xs h-5 px-1.5">Cód: {tabela.CODTAB}</Badge>
                    <Table className="w-3.5 h-3.5 md:w-5 md:h-5 text-muted-foreground flex-shrink-0" />
                  </div>
                  <CardTitle className="text-sm md:text-lg mt-1 line-clamp-1 md:line-clamp-2 leading-tight">
                    {tabela.DESCRICAO || `Tabela ${tabela.CODTAB}`}
                  </CardTitle>
                  <CardDescription className="text-[9px] md:text-xs">NUTAB: {tabela.NUTAB}</CardDescription>
                  
                  <div className="mt-2">
                    {parceiroPrincipal ? (
                      <div className="text-[9px] md:text-xs font-medium text-blue-700 bg-blue-50/50 p-1.5 md:p-2.5 rounded-md border border-blue-100/50">
                        <p className="flex items-center gap-1 mb-0.5 opacity-70">
                          <Users className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-blue-500" />
                          <span className="font-semibold uppercase tracking-tight text-[8px] md:text-[10px]">Vínculo</span>
                        </p>
                        <p className="text-[10px] md:text-sm font-bold text-blue-900 leading-tight line-clamp-1">
                          {parceiroPrincipal.NOMEPARC}
                        </p>
                      </div>
                    ) : (
                      <div className="text-[9px] md:text-xs font-medium text-gray-400 bg-gray-50/50 p-1.5 md:p-2.5 rounded-md border border-gray-100 flex items-center gap-1">
                        <Users className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 opacity-40" />
                        <span className="line-clamp-1">Sem vínculos</span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-3 md:px-6 py-2 border-t bg-slate-50/30 mt-auto">
                  <div className="flex items-center justify-between text-[10px] md:text-sm text-primary font-semibold">
                    <span>Ver preços</span>
                    <ChevronRight className="w-3 h-3 md:w-4 md:h-4 ml-1" />
                  </div>
                </CardContent>
              </Card>
            )
            })}
            {tabelasFiltradas.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
                Nenhuma tabela encontrada.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

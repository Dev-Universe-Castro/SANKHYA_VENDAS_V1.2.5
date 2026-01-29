
"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { X, Package, Boxes, ChevronDown, ChevronUp, Sparkles, BarChart3, TrendingUp, Users } from "lucide-react"
import { toast } from "sonner"
import { OfflineDataService } from "@/lib/offline-data-service"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface ProdutoDetalhesModalProps {
  produto: any
  isOpen: boolean
  onClose: () => void
}

interface AnaliseGiro {
  totalQuantidade: number
  totalValor: number
  totalNotas: number
  ticketMedio: number
  mediaQtdDiaria: number
  periodo: string
  graficoBarras: { data: string; quantidade: number; valor: number }[]
  tabelaParceiros: { parceiro: string; quantidade: number; valor: number }[]
}

export function ProdutoDetalhesModal({ produto, isOpen, onClose }: ProdutoDetalhesModalProps) {
  const [imagemUrl, setImagemUrl] = useState<string | null>(null)
  const [loadingImagem, setLoadingImagem] = useState(false)
  const [unidadesAlternativas, setUnidadesAlternativas] = useState<any[]>([])
  const [tabelasPrecos, setTabelasPrecos] = useState<any[]>([])
  const [estoques, setEstoques] = useState<any[]>([])
  const [loadingEstoque, setLoadingEstoque] = useState(false)
  const [localSelecionado, setLocalSelecionado] = useState<string>('')
  
  const [descricaoAberta, setDescricaoAberta] = useState(true)
  const [estoqueAberto, setEstoqueAberto] = useState(true)
  const [unidadesAberta, setUnidadesAberta] = useState(false)
  const [tabelasAberta, setTabelasAberta] = useState(false)
  const [analiseAberta, setAnaliseAberta] = useState(false)
  
  const [loadingAnalise, setLoadingAnalise] = useState(false)
  const [analiseGiro, setAnaliseGiro] = useState<AnaliseGiro | null>(null)

  useEffect(() => {
    if (isOpen && produto?.CODPROD) {
      carregarDadosProduto()
      setAnaliseGiro(null)
      setAnaliseAberta(false)
    }

    return () => {
      if (imagemUrl) {
        URL.revokeObjectURL(imagemUrl)
      }
    }
  }, [isOpen, produto?.CODPROD])

  const carregarDadosProduto = async () => {
    await Promise.all([
      carregarImagem(),
      carregarUnidadesAlternativas(),
      carregarTabelasPrecos(),
      carregarEstoque()
    ])
  }

  const carregarAnaliseGiro = async () => {
    if (!produto?.CODPROD) return

    setLoadingAnalise(true)
    setAnaliseAberta(true)
    
    try {
      const response = await fetch('/api/giro-produto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codProd: produto.CODPROD, meses: 1 })
      })

      if (!response.ok) {
        throw new Error('Erro ao buscar análise de giro')
      }

      const data = await response.json()
      
      if (data.analise) {
        setAnaliseGiro(data.analise)
      } else {
        toast.info('Nenhum dado de vendas encontrado para este produto no último mês')
      }
    } catch (error: any) {
      console.error('Erro ao carregar análise de giro:', error)
      toast.error('Erro ao carregar análise de giro')
    } finally {
      setLoadingAnalise(false)
    }
  }

  const carregarEstoque = async () => {
    if (!produto?.CODPROD) return

    setLoadingEstoque(true)
    try {
      const response = await fetch(`/api/oracle/estoque?codProd=${produto.CODPROD}`)
      
      if (response.ok) {
        const data = await response.json()
        setEstoques(data.estoques || [])
        if (data.estoques && data.estoques.length > 0) {
          setLocalSelecionado(data.estoques[0].CODLOCAL)
        }
      } else {
        setEstoques([])
      }
    } catch (error) {
      console.error('Erro ao carregar estoque:', error)
      setEstoques([])
    } finally {
      setLoadingEstoque(false)
    }
  }

  const carregarImagem = async () => {
    if (!produto?.CODPROD) return

    setLoadingImagem(true)
    try {
      const response = await fetch(`/api/sankhya/produtos/imagem?codProd=${produto.CODPROD}`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        setImagemUrl(url)
      } else {
        setImagemUrl(null)
      }
    } catch (error) {
      console.error('Erro ao carregar imagem:', error)
      setImagemUrl(null)
    } finally {
      setLoadingImagem(false)
    }
  }

  const carregarUnidadesAlternativas = async () => {
    if (!produto?.CODPROD) return

    try {
      const volumes = await OfflineDataService.getVolumes(produto.CODPROD)
      const unidades = [
        {
          CODVOL: produto.UNIDADE || 'UN',
          DESCRICAO: `${produto.UNIDADE || 'UN'} - Unidade Padrão`,
          QUANTIDADE: 1,
          isPadrao: true
        },
        ...volumes.filter((v: any) => v.ATIVO === 'S').map((v: any) => ({
          CODVOL: v.CODVOL,
          DESCRICAO: v.DESCRDANFE || v.CODVOL,
          QUANTIDADE: v.QUANTIDADE || 1,
          isPadrao: false
        }))
      ]
      setUnidadesAlternativas(unidades)
    } catch (error) {
      console.error('Erro ao carregar unidades alternativas:', error)
      setUnidadesAlternativas([])
    }
  }

  const carregarTabelasPrecos = async () => {
    if (!produto?.CODPROD) return

    try {
      const { OfflineDataService } = await import('@/lib/offline-data-service')
      
      const tabelasSankhya = await OfflineDataService.getTabelasPrecos()
      const tabelasConfig = await OfflineDataService.getTabelasPrecosConfig()

      let nutabParceiro: number | null = null
      try {
        const orderHeader = sessionStorage.getItem('novo_pedido_header')
        if (orderHeader) {
          const headerData = JSON.parse(orderHeader)
          const codParc = headerData?.CODPARC
          
          if (codParc) {
            const parceiros = await OfflineDataService.getParceiros()
            const parceiro = parceiros.find(p => String(p.CODPARC) === String(codParc))
            
            if (parceiro?.CODTAB) {
              const tabelaVinculada = tabelasSankhya.find(t => Number(t.CODTAB) === Number(parceiro.CODTAB))
              if (tabelaVinculada) {
                nutabParceiro = Number(tabelaVinculada.NUTAB)
              }
            }
          }
        }
      } catch (e) {
        console.error('Erro ao ler parceiro selecionado:', e)
      }

      let tabelasParaExibir: any[] = []

      if (nutabParceiro) {
        const dadosTabela = tabelasSankhya.find((t: any) => Number(t.NUTAB) === nutabParceiro)
        if (dadosTabela) {
          tabelasParaExibir.push({
            ...dadosTabela,
            DESCRICAO: `Tabela ${dadosTabela.CODTAB} (Parceiro)`
          })
        }
      }

      tabelasConfig.forEach((config: any) => {
        const jaNaLista = tabelasParaExibir.some((t: any) => Number(t.NUTAB) === Number(config.NUTAB))
        if (!jaNaLista) {
          const dadosTabela = tabelasSankhya.find((t: any) => Number(t.NUTAB) === Number(config.NUTAB))
          if (dadosTabela) {
            tabelasParaExibir.push(dadosTabela)
          }
        }
      })

      if (tabelasParaExibir.length === 0) {
        tabelasParaExibir = tabelasSankhya
      }

      const precosPromises = tabelasParaExibir.map(async (tabela: any) => {
        const nutabParaBusca = tabela.NUTAB || tabela.nutab;
        const precos = await OfflineDataService.getPrecos(
          Number(produto.CODPROD), 
          nutabParaBusca ? Number(nutabParaBusca) : undefined
        )
        
        let preco = 0
        if (precos && precos.length > 0) {
          const itemPreco = precos[0]
          const valorRaw = itemPreco.VLRVENDA !== undefined ? itemPreco.VLRVENDA : 
                           itemPreco.vlrVenda !== undefined ? itemPreco.vlrVenda : 
                           itemPreco.PRECO;

          if (valorRaw != null) {
            preco = typeof valorRaw === 'string' 
              ? parseFloat(valorRaw.replace(',', '.')) 
              : parseFloat(valorRaw)
          }
        }
        
        return {
          tabela: tabela.DESCRICAO || `Tabela ${tabela.CODTAB || nutabParaBusca}`,
          nutab: nutabParaBusca,
          codtab: tabela.CODTAB || tabela.codtab,
          preco: isNaN(preco) ? 0 : preco
        }
      })
      
      const precosData = await Promise.all(precosPromises)
      setTabelasPrecos(precosData)
    } catch (error) {
      console.error('Erro ao carregar tabelas de preços:', error)
      setTabelasPrecos([])
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const getAvatarColor = (name: string) => {
    const colors = [
      '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#10B981',
      '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6'
    ];
    const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    return colors[hash % colors.length];
  }

  if (!produto) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-full gap-0 flex flex-col w-full h-full md:h-[90vh] md:w-full overflow-hidden p-0 border-none md:border"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b bg-green-50 flex-shrink-0 sticky top-0 z-50">
          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            <Badge className="bg-green-600 text-white px-2 md:px-3 py-0.5 md:py-1 text-xs md:text-sm">
              {produto.CODPROD}
            </Badge>
            <Badge variant={produto.ATIVO === 'S' ? "default" : "secondary"} className="text-xs md:text-sm">
              {produto.ATIVO === 'S' ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 md:h-10 md:w-10">
            <X className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
        </div>

        <div className="flex flex-col md:grid md:grid-cols-2 gap-4 md:gap-6 p-4 md:p-6 overflow-y-auto flex-1">
          <div className="flex items-center justify-center flex-shrink-0">
            <div className="relative w-full h-64 md:h-[calc(100vh-200px)] bg-white rounded-lg border-2 border-gray-100 flex items-center justify-center overflow-hidden">
              {loadingImagem ? (
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs md:text-sm font-medium text-green-600">Carregando...</p>
                </div>
              ) : (
                <>
                  <div className={`flex items-center justify-center w-full h-full ${imagemUrl ? 'absolute inset-0' : ''}`}>
                    <div
                      className="w-32 h-32 md:w-48 md:h-48 rounded-full flex items-center justify-center text-white font-bold text-4xl md:text-6xl"
                      style={{ backgroundColor: getAvatarColor(produto.DESCRPROD || 'P') }}
                    >
                      {(produto.DESCRPROD || 'P')
                        .split(' ')
                        .filter((word: string) => word.length > 0)
                        .slice(0, 2)
                        .map((word: string) => word[0])
                        .join('')
                        .toUpperCase()}
                    </div>
                  </div>
                  
                  {imagemUrl && (
                    <img 
                      src={imagemUrl} 
                      alt={produto.DESCRPROD}
                      className="w-full h-full object-contain p-4 md:p-6 relative z-10"
                      onError={(e) => {
                        const target = e.currentTarget
                        target.style.display = 'none'
                        setImagemUrl(null)
                      }}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col space-y-3 md:space-y-4 md:overflow-y-auto md:pr-2">
            <Collapsible open={descricaoAberta} onOpenChange={setDescricaoAberta}>
              <Card className="flex-shrink-0">
                <CollapsibleTrigger asChild>
                  <CardContent className="p-3 md:p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-green-600 font-semibold flex items-center gap-2 cursor-pointer">
                        <Package className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        Descrição do Produto
                      </Label>
                      {descricaoAberta ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                    </div>
                  </CardContent>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 px-3 pb-3 md:px-4 md:pb-4">
                    <p className="text-sm md:text-sm font-medium leading-relaxed">{produto.DESCRPROD}</p>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            <Collapsible open={estoqueAberto} onOpenChange={setEstoqueAberto}>
              <Card className="flex-shrink-0">
                <CollapsibleTrigger asChild>
                  <CardContent className="p-3 md:p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-green-600 font-semibold flex items-center gap-2 cursor-pointer">
                        <Package className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        Estoque Atual
                      </Label>
                      {estoqueAberto ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                    </div>
                  </CardContent>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 px-3 pb-3 md:px-4 md:pb-4">
                    {loadingEstoque ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : estoques.length > 0 ? (
                      <div className="space-y-2">
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-[10px] md:text-xs text-muted-foreground">Local de Estoque:</Label>
                          <select
                            value={localSelecionado}
                            onChange={(e) => setLocalSelecionado(e.target.value)}
                            className="w-full text-xs md:text-sm p-2 border rounded bg-white"
                          >
                            {estoques.map((est, idx) => (
                              <option key={idx} value={est.CODLOCAL}>
                                {est.CODLOCAL} - Qtd: {parseFloat(est.ESTOQUE || '0').toFixed(2)}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {localSelecionado && (
                          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-[10px] md:text-xs text-muted-foreground">Local</p>
                                <p className="text-sm md:text-base font-semibold text-green-700">{localSelecionado}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] md:text-xs text-muted-foreground">Quantidade</p>
                                <p className="text-lg md:text-xl font-bold text-green-600">
                                  {parseFloat(estoques.find(e => e.CODLOCAL === localSelecionado)?.ESTOQUE || '0').toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="pt-2 border-t">
                          <div className="flex items-center justify-between text-xs md:text-sm">
                            <span className="font-medium text-muted-foreground">Estoque Total:</span>
                            <span className="font-bold text-green-600">
                              {estoques.reduce((sum, est) => sum + parseFloat(est.ESTOQUE || '0'), 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-3 text-xs md:text-sm text-muted-foreground">
                        Nenhum estoque disponível
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {unidadesAlternativas.length > 0 && (
              <Collapsible open={unidadesAberta} onOpenChange={setUnidadesAberta}>
                <Card className="flex-shrink-0">
                  <CollapsibleTrigger asChild>
                    <CardContent className="p-3 md:p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-green-600 font-semibold flex items-center gap-2 cursor-pointer">
                          <Boxes className="w-3.5 h-3.5 md:w-4 md:h-4" />
                          Unidades Alternativas
                        </Label>
                        {unidadesAberta ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 px-3 pb-3 md:px-4 md:pb-4">
                      <div className="space-y-2 max-h-32 md:max-h-40 overflow-y-auto">
                        {unidadesAlternativas.map((unidade, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs md:text-sm p-2 bg-gray-50 rounded">
                            <div>
                              <span className="font-medium">{unidade.CODVOL}</span>
                              {unidade.isPadrao && (
                                <Badge variant="outline" className="ml-2 text-[9px] md:text-[10px] px-1 md:px-1.5 py-0">Padrão</Badge>
                              )}
                            </div>
                            <span className="text-muted-foreground text-xs">Qtd: {unidade.QUANTIDADE}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            {tabelasPrecos.length > 0 && (
              <Collapsible open={tabelasAberta} onOpenChange={setTabelasAberta}>
                <Card className="flex-shrink-0">
                  <CollapsibleTrigger asChild>
                    <CardContent className="p-3 md:p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-green-600 font-semibold flex items-center gap-2 cursor-pointer">
                          <TrendingUp className="w-3.5 h-3.5 md:w-4 md:h-4" />
                          Tabelas de Vendas Vinculadas
                        </Label>
                        {tabelasAberta ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 px-3 pb-3 md:px-4 md:pb-4">
                      <div className="space-y-2 max-h-40 md:max-h-48 overflow-y-auto">
                        {tabelasPrecos.map((preco, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs md:text-sm p-2 bg-gray-50 rounded gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs truncate">{preco.tabela}</p>
                              <p className="text-[9px] md:text-[10px] text-muted-foreground truncate">NUTAB: {preco.nutab} | CODTAB: {preco.codtab}</p>
                            </div>
                            <span className="font-semibold text-green-600 text-xs md:text-sm whitespace-nowrap">
                              {preco.preco > 0 ? formatCurrency(preco.preco) : '-'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            <Collapsible open={analiseAberta} onOpenChange={setAnaliseAberta}>
              <Card className="flex-shrink-0 border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
                <CollapsibleTrigger asChild>
                  <CardContent className="p-3 md:p-4 cursor-pointer hover:bg-purple-100/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-purple-600 font-semibold flex items-center gap-2 cursor-pointer">
                        <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        Análise de Giro IA
                      </Label>
                      {analiseAberta ? <ChevronUp className="w-4 h-4 text-purple-500" /> : <ChevronDown className="w-4 h-4 text-purple-500" />}
                    </div>
                  </CardContent>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 px-3 pb-3 md:px-4 md:pb-4">
                    {!analiseGiro && !loadingAnalise && (
                      <div className="text-center py-4">
                        <Button 
                          onClick={carregarAnaliseGiro}
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <BarChart3 className="w-4 h-4 mr-2" />
                          Carregar Análise de Giro
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                          Analisa vendas do último mês
                        </p>
                      </div>
                    )}

                    {loadingAnalise && (
                      <div className="flex flex-col items-center justify-center py-6">
                        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-3" />
                        <p className="text-sm text-purple-600 font-medium">Analisando vendas...</p>
                      </div>
                    )}

                    {analiseGiro && !loadingAnalise && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-white rounded-lg p-3 border border-purple-100">
                            <div className="flex items-center gap-1 mb-1">
                              <TrendingUp className="w-3 h-3 text-purple-500" />
                              <span className="text-[10px] text-muted-foreground">Total Vendido</span>
                            </div>
                            <p className="text-sm font-bold text-purple-700">{formatCurrency(analiseGiro.totalValor)}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-purple-100">
                            <div className="flex items-center gap-1 mb-1">
                              <Package className="w-3 h-3 text-purple-500" />
                              <span className="text-[10px] text-muted-foreground">Qtd. Vendida</span>
                            </div>
                            <p className="text-sm font-bold text-purple-700">{analiseGiro.totalQuantidade} un</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-purple-100">
                            <div className="flex items-center gap-1 mb-1">
                              <BarChart3 className="w-3 h-3 text-purple-500" />
                              <span className="text-[10px] text-muted-foreground">Total Notas</span>
                            </div>
                            <p className="text-sm font-bold text-purple-700">{analiseGiro.totalNotas}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-purple-100">
                            <div className="flex items-center gap-1 mb-1">
                              <Users className="w-3 h-3 text-purple-500" />
                              <span className="text-[10px] text-muted-foreground">Ticket Médio</span>
                            </div>
                            <p className="text-sm font-bold text-purple-700">{formatCurrency(analiseGiro.ticketMedio)}</p>
                          </div>
                        </div>

                        {analiseGiro.graficoBarras.length > 0 && (
                          <div className="bg-white rounded-lg p-3 border border-purple-100">
                            <p className="text-xs font-semibold text-purple-700 mb-2">Vendas por Dia</p>
                            <div className="h-40">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analiseGiro.graficoBarras} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                  <XAxis 
                                    dataKey="data" 
                                    tick={{ fontSize: 8 }} 
                                    tickFormatter={(value) => value.split('/').slice(0, 2).join('/')}
                                  />
                                  <YAxis tick={{ fontSize: 8 }} />
                                  <Tooltip 
                                    formatter={(value: number) => [value.toFixed(2), 'Quantidade']}
                                    labelFormatter={(label) => `Data: ${label}`}
                                  />
                                  <Bar dataKey="quantidade" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        )}

                        {analiseGiro.tabelaParceiros.length > 0 && (
                          <div className="bg-white rounded-lg p-3 border border-purple-100">
                            <p className="text-xs font-semibold text-purple-700 mb-2">Top Compradores</p>
                            <div className="space-y-1.5 max-h-32 overflow-y-auto">
                              {analiseGiro.tabelaParceiros.slice(0, 5).map((p, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs p-2 bg-purple-50 rounded">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className="w-5 h-5 rounded-full bg-purple-200 text-purple-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                      {idx + 1}
                                    </span>
                                    <span className="truncate">{p.parceiro}</span>
                                  </div>
                                  <div className="text-right flex-shrink-0 ml-2">
                                    <p className="font-semibold text-purple-700">{formatCurrency(p.valor)}</p>
                                    <p className="text-[10px] text-muted-foreground">{p.quantidade} un</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <p className="text-[10px] text-center text-muted-foreground">
                          Período: {analiseGiro.periodo}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            <div className="flex gap-2 pt-4 flex-shrink-0 border-t bg-white mt-auto">
              <Button 
                variant="outline" 
                className="w-full text-xs md:text-sm h-9 md:h-10"
                onClick={onClose}
              >
                Voltar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

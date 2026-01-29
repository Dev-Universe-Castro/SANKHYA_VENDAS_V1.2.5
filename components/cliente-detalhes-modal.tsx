"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { X, User, Building2, ChevronDown, ChevronUp, Sparkles, BarChart3, TrendingUp, Package, MapPin, Phone, Mail, FileText, Globe } from "lucide-react"
import { toast } from "sonner"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import dynamic from "next/dynamic"

const MapComponent = dynamic(() => import("@/components/map-component"), {
  ssr: false,
  loading: () => <div className="w-full h-[300px] bg-muted rounded-md flex items-center justify-center">Carregando mapa...</div>
})

interface ClienteDetalhesModalProps {
  cliente: any
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
  tabelaProdutos: { produto: string; quantidade: number; valor: number }[]
}

export function ClienteDetalhesModal({ cliente, isOpen, onClose }: ClienteDetalhesModalProps) {
  const [loadingAnalise, setLoadingAnalise] = useState(false)
  const [analiseGiro, setAnaliseGiro] = useState<AnaliseGiro | null>(null)

  useEffect(() => {
    if (isOpen && cliente?.CODPARC) {
      setAnaliseGiro(null)
    }
  }, [isOpen, cliente?.CODPARC])

  const carregarAnaliseGiro = async () => {
    if (!cliente?.CODPARC) return

    setLoadingAnalise(true)
    
    try {
      const response = await fetch('/api/giro-cliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codParc: cliente.CODPARC, meses: 1 })
      })

      if (!response.ok) {
        throw new Error('Erro ao buscar análise de giro')
      }

      const data = await response.json()
      
      if (data.analise) {
        setAnaliseGiro(data.analise)
      } else {
        toast.info('Nenhum dado de vendas encontrado para este cliente no último mês')
      }
    } catch (error: any) {
      console.error('Erro ao carregar análise de giro:', error)
      toast.error('Erro ao carregar análise de giro')
    } finally {
      setLoadingAnalise(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatCPFCNPJ = (value: string) => {
    if (!value) return '-'
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    } else if (cleaned.length === 14) {
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
    }
    return value
  }

  const getAvatarColor = (name: string) => {
    const colors = [
      '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#10B981',
      '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6'
    ];
    const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    return colors[hash % colors.length];
  }

  const getInitials = (name: string) => {
    if (!name) return '??'
    const words = name.trim().split(' ')
    return (words[0][0] + (words[words.length - 1]?.[0] || '')).toUpperCase()
  }

  if (!cliente) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-full gap-0 flex flex-col w-full h-full md:h-[90vh] md:w-[800px] overflow-hidden p-0 border-none md:border"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-blue-50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-600 text-white">
              {cliente.CODPARC}
            </Badge>
            <Badge variant={cliente.ATIVO === 'S' ? "default" : "secondary"}>
              {cliente.ATIVO === 'S' ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Hero Section */}
        <div className="flex items-center gap-4 p-4 border-b bg-muted/30">
          <div
            className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md flex-shrink-0"
            style={{ backgroundColor: getAvatarColor(cliente.NOMEPARC || 'C') }}
          >
            {getInitials(cliente.NOMEPARC || 'Cliente')}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-800 truncate">
              {cliente.NOMEPARC}
            </h2>
            <p className="text-sm text-muted-foreground">
              {formatCPFCNPJ(cliente.CGC_CPF)}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="detalhes" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-muted/50 rounded-none border-b">
            <TabsTrigger value="detalhes" className="py-2 text-xs md:text-sm">Detalhes</TabsTrigger>
            <TabsTrigger value="fiscal" className="py-2 text-xs md:text-sm">Fiscal</TabsTrigger>
            <TabsTrigger value="mapa" className="py-2 text-xs md:text-sm">Mapa</TabsTrigger>
            <TabsTrigger value="giro" className="py-2 text-xs md:text-sm">Giro IA</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-4">
            <TabsContent value="detalhes" className="mt-0 space-y-4">
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="w-3 h-3" /> Nome / Razão Social
                      </Label>
                      <p className="text-sm font-semibold">{cliente.NOMEPARC}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <FileText className="w-3 h-3" /> CPF / CNPJ
                      </Label>
                      <p className="text-sm font-semibold">{formatCPFCNPJ(cliente.CGC_CPF)}</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <Label className="text-xs text-blue-600 font-bold mb-2 block uppercase tracking-wider">Endereço</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Logradouro</Label>
                        <p className="text-sm font-semibold">{cliente.ENDERECO}{cliente.NROEND ? `, ${cliente.NROEND}` : ''}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Bairro</Label>
                        <p className="text-sm font-semibold">{cliente.BAIRRO || '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Cidade / UF</Label>
                        <p className="text-sm font-semibold">{cliente.CIDADE || '-'}{cliente.UF ? ` / ${cliente.UF}` : ''}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">CEP</Label>
                        <p className="text-sm font-semibold">{cliente.CEP || '-'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <Label className="text-xs text-blue-600 font-bold mb-2 block uppercase tracking-wider">Contato</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" /> Telefone
                        </Label>
                        <p className="text-sm font-semibold">{cliente.TELEFONE || '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" /> E-mail
                        </Label>
                        <p className="text-sm font-semibold break-all">{cliente.EMAIL || '-'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="fiscal" className="mt-0">
              <Card>
                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Inscrição Estadual</Label>
                    <p className="text-sm font-semibold">{cliente.INSCRICAOESTADUAL || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Tabela de Preço</Label>
                    <p className="text-sm font-semibold">{cliente.CODTAB || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Vendedor</Label>
                    <p className="text-sm font-semibold">{cliente.CODVEND || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Limite de Crédito</Label>
                    <p className="text-sm font-semibold">{formatCurrency(parseFloat(cliente.LIMCRED || 0))}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="mapa" className="mt-0">
              <Card className="overflow-hidden">
                <div className="h-[400px] w-full">
                  <MapComponent 
                    latitude={parseFloat(cliente.LATITUDE || "0")}
                    longitude={parseFloat(cliente.LONGITUDE || "0")}
                    partnerName={cliente.NOMEPARC || "Cliente"}
                  />
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="giro" className="mt-0">
              {!analiseGiro && !loadingAnalise && (
                <div className="text-center py-12 bg-white rounded-lg border border-dashed flex flex-col items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Análise de Giro Inteligente</h3>
                    <p className="text-xs text-muted-foreground px-8 mt-1">Veja o comportamento de compra deste cliente no último mês.</p>
                  </div>
                  <Button 
                    onClick={carregarAnaliseGiro}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Gerar Análise
                  </Button>
                </div>
              )}

              {loadingAnalise && (
                <div className="flex flex-col items-center justify-center py-12 gap-3 bg-white rounded-lg border">
                  <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-purple-600 font-medium">Analisando histórico de compras...</p>
                </div>
              )}

              {analiseGiro && !loadingAnalise && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="bg-white rounded-lg p-3 border border-purple-100 shadow-sm">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Valor Total</p>
                      <p className="text-sm md:text-lg font-bold text-purple-600">{formatCurrency(analiseGiro.totalValor)}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-purple-100 shadow-sm">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Qtd. Itens</p>
                      <p className="text-sm md:text-lg font-bold text-purple-600">{analiseGiro.totalQuantidade}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-purple-100 shadow-sm">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Total Notas</p>
                      <p className="text-sm md:text-lg font-bold text-purple-600">{analiseGiro.totalNotas}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-purple-100 shadow-sm">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Ticket Médio</p>
                      <p className="text-sm md:text-lg font-bold text-purple-600">{formatCurrency(analiseGiro.ticketMedio)}</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-purple-100 shadow-sm">
                    <p className="text-xs font-bold text-purple-600 mb-4 flex items-center gap-1 uppercase tracking-wider">
                      <BarChart3 className="w-3 h-3" /> Histórico Diário de Compras
                    </p>
                    <div className="h-48 md:h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analiseGiro.graficoBarras}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                          <XAxis 
                            dataKey="data" 
                            tick={{ fontSize: 10 }} 
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis 
                            tick={{ fontSize: 10 }} 
                            width={40} 
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(val) => `R$${val}`}
                          />
                          <Tooltip 
                            formatter={(value: number) => [formatCurrency(value), 'Valor']}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          />
                          <Bar dataKey="valor" fill="#9333ea" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <Card className="border-purple-100 overflow-hidden">
                    <div className="bg-purple-600 px-4 py-2 text-white text-xs font-bold flex items-center gap-2">
                      <Package className="w-3 h-3" /> TOP 5 PRODUTOS MAIS COMPRADOS
                    </div>
                    <CardContent className="p-0">
                      <div className="divide-y">
                        {analiseGiro.tabelaProdutos.map((prod, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 hover:bg-purple-50 transition-colors">
                            <div className="flex-1 min-w-0 pr-4">
                              <p className="text-xs font-bold truncate">{prod.produto}</p>
                              <p className="text-[10px] text-muted-foreground">{prod.quantidade} unidades</p>
                            </div>
                            <p className="text-xs font-bold text-purple-600 whitespace-nowrap">{formatCurrency(prod.valor)}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

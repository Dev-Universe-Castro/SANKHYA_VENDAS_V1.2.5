"use client"

import { useState, useEffect, useCallback } from "react"
import { X, Plus, Trash2, Save, Pencil, CheckCircle, XCircle, Clock, Package, ListTodo, FileText, DollarSign, User, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ProdutoSelectorModal } from "@/components/produto-selector-modal"
import PedidoVendaRapido from "@/components/pedido-venda-rapido"
import { RefreshCw } from "lucide-react"

interface Lead {
  CODLEAD: string
  ID_EMPRESA: number
  NOME: string
  DESCRICAO: string
  VALOR: number
  ESTAGIO: string
  CODESTAGIO: string
  CODFUNIL: string
  DATA_VENCIMENTO: string
  TIPO_TAG: string
  COR_TAG: string
  CODPARC?: string
  NOMEPARC?: string
  CODUSUARIO?: number
  ATIVO: string
  DATA_CRIACAO: string
  DATA_ATUALIZACAO: string
  STATUS_LEAD?: 'EM_ANDAMENTO' | 'GANHO' | 'PERDIDO'
  MOTIVO_PERDA?: string
  DATA_CONCLUSAO?: string
  NUNOTA?: number
}

interface ProdutoLead {
  CODPRODLEAD?: number
  CODLEAD: string
  CODPROD: string
  DESCRPROD: string
  QUANTIDADE: number
  VLRUNIT: number
  VLRTOTAL: number
}

interface Tarefa {
  CODATIVIDADE: string
  CODLEAD: string
  TIPO: string
  DESCRICAO: string
  DATA_HORA: string
  DATA_INICIO: string
  DATA_FIM: string
  STATUS: 'AGUARDANDO' | 'ATRASADO' | 'REALIZADO'
  NOME_USUARIO?: string
}

interface LeadDetailModalProps {
  isOpen: boolean
  onClose: () => void
  lead: Lead | null
  onSave: () => void
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '-'
  try {
    if (dateStr.includes('/')) return dateStr
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-BR')
  } catch {
    return dateStr
  }
}

export function LeadDetailModal({ isOpen, onClose, lead, onSave }: LeadDetailModalProps) {
  const [activeTab, setActiveTab] = useState("dados")
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [produtos, setProdutos] = useState<ProdutoLead[]>([])
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [isLoadingProdutos, setIsLoadingProdutos] = useState(false)
  const [isLoadingTarefas, setIsLoadingTarefas] = useState(false)
  const [isProdutoSelectorOpen, setIsProdutoSelectorOpen] = useState(false)
  const [editingProduto, setEditingProduto] = useState<ProdutoLead | null>(null)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [statusAction, setStatusAction] = useState<'GANHO' | 'PERDIDO' | null>(null)
  const [motivoPerda, setMotivoPerda] = useState("")
  const [showPedidoModal, setShowPedidoModal] = useState(false)
  const [isActivating, setIsActivating] = useState(false)
  const { toast } = useToast()
  const isMobile = useIsMobile()

  const isLeadPerdido = lead?.STATUS_LEAD === 'PERDIDO'
  const isLeadGanho = lead?.STATUS_LEAD === 'GANHO' && !!lead?.NUNOTA
  const isLeadDisabled = isLeadPerdido || isLeadGanho

  const [formData, setFormData] = useState({
    NOME: "",
    DESCRICAO: "",
    VALOR: 0,
    DATA_VENCIMENTO: "",
    TIPO_TAG: "",
  })

  useEffect(() => {
    if (lead && isOpen) {
      setFormData({
        NOME: lead.NOME || "",
        DESCRICAO: lead.DESCRICAO || "",
        VALOR: lead.VALOR || 0,
        DATA_VENCIMENTO: lead.DATA_VENCIMENTO || "",
        TIPO_TAG: lead.TIPO_TAG || "",
      })
      setActiveTab("dados")
      setIsEditing(false)
      loadProdutos()
      loadTarefas()
    }
  }, [lead, isOpen])

  const loadProdutos = useCallback(async () => {
    if (!lead?.CODLEAD) return
    setIsLoadingProdutos(true)
    try {
      const response = await fetch(`/api/leads/produtos?codLead=${lead.CODLEAD}`)
      if (response.ok) {
        const data = await response.json()
        setProdutos(data)
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
    } finally {
      setIsLoadingProdutos(false)
    }
  }, [lead?.CODLEAD])

  const loadTarefas = useCallback(async () => {
    if (!lead?.CODLEAD) return
    setIsLoadingTarefas(true)
    try {
      const response = await fetch(`/api/leads/atividades?codLead=${lead.CODLEAD}`)
      if (response.ok) {
        const data = await response.json()
        setTarefas(data)
      }
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error)
    } finally {
      setIsLoadingTarefas(false)
    }
  }, [lead?.CODLEAD])

  const handleSaveLead = async () => {
    if (!lead || isLeadDisabled) return
    setIsSaving(true)
    try {
      const response = await fetch('/api/leads/salvar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...lead,
          ...formData,
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao salvar lead')
      }

      toast({ title: "Sucesso", description: "Lead atualizado com sucesso!" })
      setIsEditing(false)
      onSave()
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleStatusChange = async (status: 'GANHO' | 'PERDIDO') => {
    setStatusAction(status)
    if (status === 'PERDIDO') {
      setShowStatusDialog(true)
    } else if (status === 'GANHO') {
      setShowPedidoModal(true)
    }
  }

  const updateStatus = async (status: 'GANHO' | 'PERDIDO', motivo: string, nunota?: number) => {
    if (!lead) return
    try {
      const response = await fetch('/api/leads/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codLead: lead.CODLEAD,
          status,
          motivoPerda: motivo,
          nunota
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao atualizar status')
      }

      toast({ 
        title: "Sucesso", 
        description: status === 'GANHO' ? "Negócio marcado como ganho!" : "Negócio marcado como perdido"
      })
      setShowStatusDialog(false)
      setMotivoPerda("")
      onSave()
      onClose()
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" })
    }
  }

  const handleActivateLead = async () => {
    if (!lead) return
    setIsActivating(true)
    try {
      const response = await fetch('/api/leads/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codLead: lead.CODLEAD,
          status: 'EM_ANDAMENTO',
          motivoPerda: ''
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao ativar lead')
      }

      toast({ title: "Sucesso", description: "Negócio reativado com sucesso!" })
      onSave()
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" })
    } finally {
      setIsActivating(false)
    }
  }

  const handlePedidoSuccess = async (pedido: any) => {
    if (pedido?.NUNOTA) {
      await updateStatus('GANHO', '', pedido.NUNOTA)
      setShowPedidoModal(false)
    }
  }

  const handleAddProduto = async (produto: any) => {
    if (!lead || isLeadDisabled) return
    try {
      const response = await fetch('/api/leads/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          CODLEAD: lead.CODLEAD,
          CODPROD: produto.CODPROD,
          DESCRPROD: produto.DESCRPROD,
          QUANTIDADE: produto.quantidade || 1,
          VLRUNIT: produto.VLRCOMERC || produto.VLRUNIT || 0,
          VLRTOTAL: (produto.quantidade || 1) * (produto.VLRCOMERC || produto.VLRUNIT || 0),
          ID_EMPRESA: lead.ID_EMPRESA
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao adicionar produto')
      }

      toast({ title: "Sucesso", description: "Produto adicionado ao lead!" })
      loadProdutos()
      setIsProdutoSelectorOpen(false)
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" })
    }
  }

  const handleRemoveProduto = async (codProdLead: number) => {
    if (isLeadDisabled) return
    try {
      const response = await fetch(`/api/leads/produtos?codProdLead=${codProdLead}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao remover produto')
      }

      toast({ title: "Sucesso", description: "Produto removido!" })
      loadProdutos()
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" })
    }
  }

  const handleUpdateProduto = async (produto: ProdutoLead) => {
    if (isLeadDisabled) return
    try {
      const response = await fetch('/api/leads/produtos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(produto)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao atualizar produto')
      }

      toast({ title: "Sucesso", description: "Produto atualizado!" })
      setEditingProduto(null)
      loadProdutos()
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" })
    }
  }

  const handleCreateTarefa = async () => {
    if (!lead) return
    try {
      const hoje = new Date()
      const response = await fetch('/api/leads/atividades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          CODLEAD: lead.CODLEAD,
          TIPO: 'NOTA',
          DESCRICAO: 'Nova tarefa',
          DATA_INICIO: hoje.toISOString(),
          DATA_FIM: hoje.toISOString(),
          STATUS: 'AGUARDANDO',
          ID_EMPRESA: lead.ID_EMPRESA
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao criar tarefa')
      }

      toast({ title: "Sucesso", description: "Tarefa criada!" })
      loadTarefas()
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" })
    }
  }

  const totalProdutos = produtos.reduce((sum, p) => sum + (p.VLRTOTAL || 0), 0)

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case 'GANHO':
        return <Badge className="bg-green-500 text-white">Ganho</Badge>
      case 'PERDIDO':
        return <Badge className="bg-red-500 text-white">Perdido</Badge>
      default:
        return <Badge className="bg-blue-500 text-white">Em Andamento</Badge>
    }
  }

  const getTarefaStatusBadge = (status: string) => {
    switch (status) {
      case 'REALIZADO':
        return <Badge className="bg-green-100 text-green-700">Realizado</Badge>
      case 'ATRASADO':
        return <Badge className="bg-red-100 text-red-700">Atrasado</Badge>
      default:
        return <Badge className="bg-yellow-100 text-yellow-700">Aguardando</Badge>
    }
  }

  if (!lead) return null

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={`${isMobile ? 'max-w-full h-full rounded-none' : 'max-w-3xl max-h-[90vh]'} p-0 overflow-hidden`}>
          <DialogHeader className="p-4 pb-2 border-b bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground font-mono">#{lead.CODLEAD}</span>
                  {getStatusBadge(lead.STATUS_LEAD)}
                </div>
                <DialogTitle className="text-xl font-bold truncate">{lead.NOME}</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">{formatCurrency(lead.VALOR)}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full">
            <TabsList className="w-full justify-start gap-1 px-4 pt-2 bg-transparent border-b rounded-none">
              <TabsTrigger value="dados" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg">
                <FileText className="w-4 h-4 mr-2" />
                Dados
              </TabsTrigger>
              <TabsTrigger value="produtos" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg">
                <Package className="w-4 h-4 mr-2" />
                Produtos ({produtos.length})
              </TabsTrigger>
              <TabsTrigger value="tarefas" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg">
                <ListTodo className="w-4 h-4 mr-2" />
                Tarefas ({tarefas.length})
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 p-4">
              <TabsContent value="dados" className="mt-0 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Informações do Lead</CardTitle>
                      {!isEditing ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setIsEditing(true)}
                          disabled={isLeadDisabled}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Editar
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                            Cancelar
                          </Button>
                          <Button size="sm" onClick={handleSaveLead} disabled={isSaving}>
                            <Save className="w-4 h-4 mr-2" />
                            {isSaving ? 'Salvando...' : 'Salvar'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nome</Label>
                        {isEditing ? (
                          <Input 
                            value={formData.NOME} 
                            onChange={(e) => setFormData({...formData, NOME: e.target.value})}
                          />
                        ) : (
                          <p className="text-sm p-2 bg-muted rounded">{lead.NOME}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Valor</Label>
                        {isEditing ? (
                          <Input 
                            type="number"
                            value={formData.VALOR} 
                            onChange={(e) => setFormData({...formData, VALOR: parseFloat(e.target.value) || 0})}
                          />
                        ) : (
                          <p className="text-sm p-2 bg-muted rounded font-medium">{formatCurrency(lead.VALOR)}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Data de Vencimento</Label>
                        {isEditing ? (
                          <Input 
                            type="date"
                            value={formData.DATA_VENCIMENTO} 
                            onChange={(e) => setFormData({...formData, DATA_VENCIMENTO: e.target.value})}
                          />
                        ) : (
                          <p className="text-sm p-2 bg-muted rounded">{formatDate(lead.DATA_VENCIMENTO)}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Tag</Label>
                        {isEditing ? (
                          <Input 
                            value={formData.TIPO_TAG} 
                            onChange={(e) => setFormData({...formData, TIPO_TAG: e.target.value})}
                          />
                        ) : (
                          <p className="text-sm p-2 bg-muted rounded">{lead.TIPO_TAG || '-'}</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      {isEditing ? (
                        <Textarea 
                          value={formData.DESCRICAO} 
                          onChange={(e) => setFormData({...formData, DESCRICAO: e.target.value})}
                          rows={3}
                        />
                      ) : (
                        <p className="text-sm p-2 bg-muted rounded min-h-[60px]">{lead.DESCRICAO || '-'}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Criado em:</span> {formatDate(lead.DATA_CRIACAO)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Atualizado em:</span> {formatDate(lead.DATA_ATUALIZACAO)}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {!isLeadDisabled && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Ações</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-3 flex-wrap">
                        <Button 
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleStatusChange('GANHO')}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Gerar Pedido (Ganho)
                        </Button>
                        <Button 
                          variant="destructive"
                          onClick={() => handleStatusChange('PERDIDO')}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Marcar como Perdido
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {isLeadPerdido && (
                  <Card className="border-red-200 bg-red-50">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base text-red-700">Negócio Perdido</CardTitle>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={handleActivateLead}
                          disabled={isActivating}
                        >
                          <RefreshCw className={`w-4 h-4 mr-2 ${isActivating ? 'animate-spin' : ''}`} />
                          Ativar
                        </Button>
                      </div>
                    </CardHeader>
                    {lead.MOTIVO_PERDA && (
                      <CardContent>
                        <p className="text-sm text-red-600">{lead.MOTIVO_PERDA}</p>
                      </CardContent>
                    )}
                  </Card>
                )}

                {isLeadGanho && (
                  <Card className="border-green-200 bg-green-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-green-700">Negócio Ganho</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-green-600">
                        Pedido gerado: <span className="font-bold">#{lead.NUNOTA}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Este negócio está concluído e não pode ser alterado.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="produtos" className="mt-0 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Produtos do Lead</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Total: {formatCurrency(totalProdutos)}
                        </p>
                      </div>
                      <Button size="sm" onClick={() => setIsProdutoSelectorOpen(true)} disabled={isLeadDisabled}>
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Produto
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoadingProdutos ? (
                      <div className="text-center py-8 text-muted-foreground">Carregando produtos...</div>
                    ) : produtos.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p>Nenhum produto adicionado</p>
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => setIsProdutoSelectorOpen(true)} disabled={isLeadDisabled}>
                          <Plus className="w-4 h-4 mr-2" />
                          Adicionar Produto
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {produtos.map((produto) => (
                          <div key={produto.CODPRODLEAD || produto.CODPROD} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{produto.DESCRPROD}</p>
                              <p className="text-xs text-muted-foreground">Cód: {produto.CODPROD}</p>
                            </div>
                            {editingProduto?.CODPRODLEAD === produto.CODPRODLEAD && editingProduto ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  className="w-20 h-8"
                                  value={editingProduto.QUANTIDADE}
                                  onChange={(e) => {
                                    const qty = parseInt(e.target.value) || 1
                                    setEditingProduto({
                                      ...editingProduto,
                                      QUANTIDADE: qty,
                                      VLRTOTAL: qty * editingProduto.VLRUNIT
                                    })
                                  }}
                                />
                                <Button size="sm" onClick={() => editingProduto && handleUpdateProduto(editingProduto)}>
                                  <Save className="w-3 h-3" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingProduto(null)}>
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <div className="text-right">
                                  <p className="text-sm font-medium">{formatCurrency(produto.VLRTOTAL)}</p>
                                  <p className="text-xs text-muted-foreground">{produto.QUANTIDADE}x {formatCurrency(produto.VLRUNIT)}</p>
                                </div>
                                <div className="flex gap-1">
                                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingProduto(produto)}>
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => produto.CODPRODLEAD && handleRemoveProduto(produto.CODPRODLEAD)}>
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tarefas" className="mt-0 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Tarefas Vinculadas</CardTitle>
                      <Button size="sm" onClick={handleCreateTarefa}>
                        <Plus className="w-4 h-4 mr-2" />
                        Nova Tarefa
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoadingTarefas ? (
                      <div className="text-center py-8 text-muted-foreground">Carregando tarefas...</div>
                    ) : tarefas.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <ListTodo className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p>Nenhuma tarefa vinculada</p>
                        <Button variant="outline" size="sm" className="mt-3" onClick={handleCreateTarefa}>
                          <Plus className="w-4 h-4 mr-2" />
                          Criar Tarefa
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {tarefas.map((tarefa) => (
                          <div key={tarefa.CODATIVIDADE} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">{tarefa.TIPO}</Badge>
                                {getTarefaStatusBadge(tarefa.STATUS)}
                              </div>
                              <p className="text-sm">{tarefa.DESCRICAO}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(tarefa.DATA_INICIO)}
                                </span>
                                {tarefa.NOME_USUARIO && (
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {tarefa.NOME_USUARIO}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar como Perdido</AlertDialogTitle>
            <AlertDialogDescription>
              Por favor, informe o motivo da perda deste negócio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Descreva o motivo da perda..."
              value={motivoPerda}
              onChange={(e) => setMotivoPerda(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowStatusDialog(false); setMotivoPerda(""); }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => updateStatus('PERDIDO', motivoPerda)}
              disabled={!motivoPerda.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirmar Perda
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ProdutoSelectorModal
        isOpen={isProdutoSelectorOpen}
        onClose={() => setIsProdutoSelectorOpen(false)}
        onConfirm={(produto, preco, quantidade) => handleAddProduto({ ...produto, VLRUNIT: preco, quantidade })}
      />

      <PedidoVendaRapido
        isOpen={showPedidoModal}
        onClose={() => setShowPedidoModal(false)}
        parceiroSelecionado={lead?.CODPARC ? {
          CODPARC: parseInt(lead.CODPARC),
          NOMEPARC: lead.NOMEPARC || ''
        } : undefined}
        pedidoBase={{
          itens: produtos.map(p => ({
            CODPROD: p.CODPROD,
            DESCRPROD: p.DESCRPROD,
            QTDNEG: p.QUANTIDADE,
            VLRUNIT: p.VLRUNIT,
            PERCDESC: 0,
            CODLOCALORIG: '0',
            CONTROLE: ''
          })),
          observacao: `Lead #${lead?.CODLEAD} - ${lead?.NOME || ''}`
        }}
        onSuccess={handlePedidoSuccess}
      />
    </>
  )
}

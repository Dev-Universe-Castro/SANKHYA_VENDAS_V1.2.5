"use client"

import { cn } from "@/lib/utils"
import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, List, Calendar, Clock, AlertCircle, CheckCircle2, Archive, FileText, Info, Users, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from '@/components/ui/badge'

// --- Interfaces ---
interface CalendarioEvento {
  CODATIVIDADE: string
  CODLEAD?: string
  TIPO: string
  TITULO: string
  DESCRICAO: string
  DATA_INICIO: string
  DATA_FIM: string
  STATUS: 'ATRASADO' | 'EM_ANDAMENTO' | 'REALIZADO' | 'AGUARDANDO'
  COR?: string
  ATIVO?: string
  CODPARC?: string
  NOMEPARC?: string
}

interface NovaAtividade {
  TIPO: string
  TITULO: string
  DESCRICAO: string
  DATA_INICIO: string
  DATA_FIM: string
  STATUS: 'ATRASADO' | 'EM_ANDAMENTO' | 'REALIZADO' | 'AGUARDANDO'
  COR: string
  CODLEAD?: string
  CODPARC?: string
}

interface EventoItemProps {
  evento: CalendarioEvento
  onUpdate: () => void
  onUpdateLocal: (evento: CalendarioEvento) => void
  onClose?: () => void
}

// --- Componente de Item de Evento (Card Individual) ---
function EventoItem({ evento, onUpdate, onUpdateLocal, onClose }: EventoItemProps) {
  const [editando, setEditando] = useState(false)
  const [titulo, setTitulo] = useState(evento.TITULO)
  const [descricao, setDescricao] = useState(evento.DESCRICAO)
  const [tipo, setTipo] = useState(evento.TIPO)
  const [cor, setCor] = useState(evento.COR || '#22C55E')
  const [dataInicio, setDataInicio] = useState(evento.DATA_INICIO.slice(0, 16))
  const [dataFim, setDataFim] = useState(evento.DATA_FIM.slice(0, 16))
  const [salvando, setSalvando] = useState(false)
  const [concluindo, setConcluindo] = useState(false)
  const [mostrarAlertaInativar, setMostrarAlertaInativar] = useState(false)
  const [inativando, setInativando] = useState(false)
  const { toast } = useToast()

  const marcarStatus = async (novoStatus: string) => {
    try {
      setConcluindo(true)
      const response = await fetch('/api/leads/atividades/atualizar-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ CODATIVIDADE: evento.CODATIVIDADE, STATUS: novoStatus })
      })
      if (!response.ok) throw new Error('Erro ao atualizar status')
      onUpdateLocal({ ...evento, STATUS: novoStatus as any })
      await onUpdate()
      toast({ title: "Sucesso", description: `Status alterado para ${novoStatus}` })
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" })
    } finally {
      setConcluindo(false)
    }
  }

  const salvarEdicao = async () => {
    try {
      setSalvando(true)
      const response = await fetch('/api/leads/atividades/atualizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          CODATIVIDADE: evento.CODATIVIDADE,
          TITULO: titulo,
          DESCRICAO: descricao,
          TIPO: tipo,
          COR: cor,
          DATA_INICIO: dataInicio + ':00',
          DATA_FIM: dataFim + ':00'
        })
      })
      if (!response.ok) throw new Error('Erro ao atualizar')
      setEditando(false)
      await onUpdate()
      toast({ title: "Atividade atualizada" })
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" })
    } finally {
      setSalvando(false)
    }
  }

  const inativar = async () => {
    try {
      setInativando(true)
      const response = await fetch('/api/leads/atividades/atualizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ CODATIVIDADE: evento.CODATIVIDADE, ATIVO: 'N' })
      })
      if (!response.ok) throw new Error('Erro ao inativar')
      setMostrarAlertaInativar(false)
      if (onClose) onClose()
      await onUpdate()
      toast({ title: "Atividade removida" })
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" })
    } finally {
      setInativando(false)
    }
  }

  return (
    <div className="flex gap-2 items-start mb-2 group w-full overflow-hidden">
      <div className="mt-5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cor }} />
      
      <div className="flex-1 min-w-0 bg-white border rounded-xl p-3 shadow-sm hover:shadow-md transition-all overflow-hidden">
        <div className="flex items-start justify-between gap-2 overflow-hidden">
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center gap-2 mb-1.5 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center flex-shrink-0 border">
                {evento.STATUS === 'REALIZADO' ? (
                  <CheckCircle2 className="text-green-600 w-3.5 h-3.5" />
                ) : (
                  <Clock className="text-blue-500 w-3.5 h-3.5" />
                )}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <h3 className="font-bold text-slate-800 text-xs sm:text-sm truncate uppercase tracking-tight">
                  {evento.TIPO}: {evento.TITULO}
                </h3>
                {evento.CODPARC && (
                  <span className="text-[9px] font-bold text-primary flex items-center gap-1 truncate">
                    <Users className="w-2.5 h-2.5 shrink-0" /> {evento.CODPARC} - {evento.NOMEPARC || 'PARCEIRO'}
                  </span>
                )}
              </div>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-tight line-clamp-2 break-words">
              {evento.DESCRICAO}
            </p>
            
            <div className="mt-3 pt-2 border-t flex flex-wrap items-center gap-2">
               {evento.TIPO === 'VISITA' ? (
                 <span className="text-[9px] text-slate-400 italic flex items-center gap-1 truncate">
                   <Info className="w-2.5 h-2.5 shrink-0" /> Controle via Visitas
                 </span>
               ) : (
                 <div className="flex gap-1.5">
                   <Button 
                     size="sm" 
                     variant="ghost" 
                     className="h-6 px-2 text-[9px] font-bold text-slate-600 hover:bg-slate-100" 
                     onClick={() => marcarStatus(evento.STATUS === 'REALIZADO' ? 'AGUARDANDO' : 'REALIZADO')}
                   >
                     {evento.STATUS === 'REALIZADO' ? 'REABRIR' : 'CONCLUIR'}
                   </Button>
                   <Button 
                     size="sm" 
                     variant="ghost" 
                     className="h-6 px-2 text-[9px] font-bold text-slate-600 hover:bg-slate-100" 
                     onClick={() => setEditando(true)}
                   >
                     EDITAR
                   </Button>
                 </div>
               )}
            </div>
          </div>

          <Badge 
            variant="outline" 
            className={`text-[9px] font-bold px-1.5 py-0 rounded-full border-none text-white shrink-0 ${
              evento.STATUS === 'REALIZADO' ? 'bg-green-600' : 'bg-slate-800'
            }`}
          >
            {evento.STATUS === 'REALIZADO' ? 'OK' : evento.STATUS.substring(0, 3)}
          </Badge>
        </div>

        {editando && (
          <div className="mt-4 space-y-3 border-t pt-4 animate-in fade-in slide-in-from-top-1">
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título" className="h-9 text-sm" />
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição" className="text-sm min-h-[80px]" />
            <div className="flex gap-2">
              <Button size="sm" onClick={salvarEdicao} disabled={salvando} className="h-8 text-xs font-bold">SALVAR</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditando(false)} className="h-8 text-xs font-bold">CANCELAR</Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={mostrarAlertaInativar} onOpenChange={setMostrarAlertaInativar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja inativar esta tarefa?</AlertDialogTitle>
            <AlertDialogDescription>Ela poderá ser recuperada na lista de inativos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction onClick={inativar} className="bg-red-600">Sim, inativar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// --- Componente Principal ---
export default function CalendarioView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [eventos, setEventos] = useState<CalendarioEvento[]>([])
  const [loading, setLoading] = useState(true)
  const [visualizacao, setVisualizacao] = useState<'calendario' | 'lista'>('calendario')

  // Estados de Modais
  const [modalDiaAberto, setModalDiaAberto] = useState(false)
  const [modalNovaAtividadeAberto, setModalNovaAtividadeAberto] = useState(false)
  const [modalInativosAberto, setModalInativosAberto] = useState(false)
  const [parceiros, setParceiros] = useState<any[]>([])
  const [buscandoParceiros, setBuscandoParceiros] = useState(false)

  // Estados de Dados Selecionados
  const [eventosDoDia, setEventosDoDia] = useState<CalendarioEvento[]>([])
  const [eventosInativos, setEventosInativos] = useState<CalendarioEvento[]>([])
  const [dataSelecionada, setDataSelecionada] = useState<Date | null>(null)

  // Estados de Filtro e Criação
  const [dataInicioFiltro, setDataInicioFiltro] = useState("")
  const [dataFimFiltro, setDataFimFiltro] = useState("")
  const [salvandoAtividade, setSalvandoAtividade] = useState(false)
  const [reativando, setReativando] = useState<string | null>(null)
  const [novaAtividade, setNovaAtividade] = useState<NovaAtividade>({
    TIPO: 'EMAIL', TITULO: '', DESCRICAO: '', DATA_INICIO: new Date().toISOString().split('T')[0], DATA_FIM: new Date().toISOString().split('T')[0], STATUS: 'AGUARDANDO', COR: '#22C55E'
  })

  const { toast } = useToast()
  const diasSemana = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']

  // --- Funções de API ---
  const loadEventos = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (dataInicioFiltro) params.append('dataInicio', dataInicioFiltro)
      if (dataFimFiltro) params.append('dataFim', dataFimFiltro)

      const res = await fetch(`/api/leads/eventos?${params.toString()}&t=${Date.now()}`)
      const data = await res.json()
      setEventos(data.filter((e: any) => e.ATIVO !== 'N'))

      const resInativos = await fetch(`/api/leads/eventos/inativos?t=${Date.now()}`)
      const inativos = await resInativos.json()
      setEventosInativos(inativos)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadEventos() }, [currentDate])

  useEffect(() => {
    const fetchParceiros = async () => {
      try {
        setBuscandoParceiros(true)
        const res = await fetch('/api/parceiros/listar?limit=100')
        if (res.ok) {
          const data = await res.json()
          setParceiros(data)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setBuscandoParceiros(false)
      }
    }
    fetchParceiros()
  }, [])

  // --- Lógica de Renderização do Calendário ---
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear(), month = date.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days = []
    for (let i = 0; i < firstDay; i++) days.push({ day: '', isCurrentMonth: false, date: new Date() })
    for (let i = 1; i <= daysInMonth; i++) days.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) })
    return days
  }

  const getEventosForDay = (date: Date) => {
    return eventos.filter(e => new Date(e.DATA_INICIO).toDateString() === date.toDateString())
  }

  const handleSalvarNova = async () => {
    if (!novaAtividade.TITULO) return toast({ title: "Título obrigatório", variant: "destructive" })
    try {
      setSalvandoAtividade(true)
      const res = await fetch('/api/leads/atividades/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novaAtividade)
      })
      if (res.ok) {
        setModalNovaAtividadeAberto(false)
        setNovaAtividade({
          TIPO: 'EMAIL', TITULO: '', DESCRICAO: '', DATA_INICIO: new Date().toISOString().split('T')[0], DATA_FIM: new Date().toISOString().split('T')[0], STATUS: 'AGUARDANDO', COR: '#22C55E'
        })
        loadEventos()
        toast({ title: "Tarefa criada com sucesso!" })
      }
    } finally {
      setSalvandoAtividade(false)
    }
  }

  const handleReativar = async (id: string) => {
    setReativando(id)
    await fetch('/api/leads/atividades/atualizar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ CODATIVIDADE: id, ATIVO: 'S' }) })
    setReativando(null)
    loadEventos()
    toast({ title: "Tarefa reativada" })
  }

  if (loading) return <div className="flex h-screen items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header - Desktop */}
      <div className="hidden md:block border-b p-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Minhas Tarefas</h1>
              <p className="text-muted-foreground">
                Gestão de atividades e compromissos
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setModalInativosAberto(true)} className="h-9">
                <Archive className="w-4 h-4 mr-2"/>Arquivados ({eventosInativos.length})
              </Button>
              <Button size="sm" className="bg-green-600 hover:bg-green-700 h-9" onClick={() => setModalNovaAtividadeAberto(true)}>
                <Plus className="w-4 h-4 mr-2"/>Nova Tarefa
              </Button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex gap-2">
              <Button size="sm" variant={visualizacao === 'calendario' ? 'default' : 'outline'} onClick={() => setVisualizacao('calendario')} className="h-9">
                <Calendar className="w-4 h-4 mr-2"/>Calendário
              </Button>
              <Button size="sm" variant={visualizacao === 'lista' ? 'default' : 'outline'} onClick={() => setVisualizacao('lista')} className="h-9">
                <List className="w-4 h-4 mr-2"/>Lista
              </Button>
            </div>

            <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-lg border">
              <div className="flex items-center gap-2 px-2 border-r">
                <Label className="text-[11px] font-bold text-slate-500 uppercase">De</Label>
                <Input type="date" className="h-7 w-32 text-xs border-none bg-transparent focus-visible:ring-0 p-0" value={dataInicioFiltro} onChange={e => setDataInicioFiltro(e.target.value)} />
              </div>
              <div className="flex items-center gap-2 px-2 border-r">
                <Label className="text-[11px] font-bold text-slate-500 uppercase">Até</Label>
                <Input type="date" className="h-7 w-32 text-xs border-none bg-transparent focus-visible:ring-0 p-0" value={dataFimFiltro} onChange={e => setDataFimFiltro(e.target.value)} />
              </div>
              <div className="flex gap-1 pl-1">
                <Button size="sm" className="h-7 px-3 text-[11px] font-bold" onClick={loadEventos}>FILTRAR</Button>
                {(dataInicioFiltro || dataFimFiltro) && (
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] font-bold" onClick={() => {setDataInicioFiltro(""); setDataFimFiltro(""); loadEventos()}}>
                    LIMPAR
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Header - Mobile */}
      <div className="md:hidden border-b px-3 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h1 className="text-lg font-bold">Minhas Tarefas</h1>
            <p className="text-xs text-muted-foreground">Gestão de atividades</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setModalInativosAberto(true)}>
              <Archive className="w-4 h-4 text-slate-500"/>
            </Button>
            <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8 px-2" onClick={() => setModalNovaAtividadeAberto(true)}>
              <Plus className="w-4 h-4"/>
            </Button>
          </div>
        </div>
        
        <div className="space-y-3">
            <div className="flex gap-2">
              <Button size="sm" variant={visualizacao === 'calendario' ? 'default' : 'outline'} className="h-8 flex-1 text-[11px] font-bold" onClick={() => setVisualizacao('calendario')}>
                <Calendar className="w-3.5 h-3.5 mr-1.5"/>CALENDÁRIO
              </Button>
              <Button size="sm" variant={visualizacao === 'lista' ? 'default' : 'outline'} className="h-8 flex-1 text-[11px] font-bold" onClick={() => setVisualizacao('lista')}>
                <List className="w-3.5 h-3.5 mr-1.5"/>LISTA
              </Button>
            </div>

          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-lg border">
            <div className="flex flex-col gap-1">
              <Label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Início</Label>
              <Input type="date" className="h-8 text-[11px] bg-white border-slate-200" value={dataInicioFiltro} onChange={e => setDataInicioFiltro(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Fim</Label>
              <Input type="date" className="h-8 text-[11px] bg-white border-slate-200" value={dataFimFiltro} onChange={e => setDataFimFiltro(e.target.value)} />
            </div>
            <Button size="sm" className="col-span-2 h-8 text-[11px] font-bold mt-1" onClick={loadEventos}>FILTRAR TAREFAS</Button>
          </div>
        </div>
      </div>

      {/* Conteúdo com scroll independente */}
      <div className="flex-1 overflow-auto p-4 md:p-6 scrollbar-hide">
        {/* RENDERIZAÇÃO CONDICIONAL */}
        {visualizacao === 'lista' ? (
          <div className="max-w-[1400px] mx-auto space-y-2">
            {eventos.length === 0 ? (
               <div className="text-center py-20 bg-white rounded-xl border border-dashed">
                  <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">Nenhuma tarefa encontrada para este período.</p>
               </div>
            ) : (
              eventos
                .sort((a, b) => new Date(a.DATA_INICIO).getTime() - new Date(b.DATA_INICIO).getTime())
                .map(e => (
                  <EventoItem 
                    key={e.CODATIVIDADE} 
                    evento={e} 
                    onUpdate={loadEventos}
                    onUpdateLocal={(ev) => setEventos(prev => prev.map(p => p.CODATIVIDADE === ev.CODATIVIDADE ? ev : p))}
                  />
                ))
            )}
          </div>
        ) : (
          <div className="max-w-[1400px] mx-auto bg-white rounded-xl shadow-sm border overflow-hidden">
            {/* Cabeçalho do Calendário */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">
                {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}><ChevronLeft className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(new Date())}><Clock className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>

            {/* Grid do Calendário */}
            <div className="grid grid-cols-7 border-b bg-slate-50">
              {diasSemana.map(d => <div key={d} className="py-2 text-center text-[10px] font-bold text-slate-400 border-r last:border-r-0 uppercase">{d}</div>)}
            </div>

            <div className="grid grid-cols-7 auto-rows-fr">
              {getDaysInMonth(currentDate).map((day, i) => {
                const dayEvents = day.day ? getEventosForDay(day.date) : []
                const isToday = day.day && day.date.toDateString() === new Date().toDateString()

                return (
                  <div 
                    key={i} 
                    className={cn(
                      "min-h-[80px] md:min-h-[120px] p-1 border-r border-b last:border-r-0 relative group transition-colors",
                      !day.day ? "bg-slate-50/50" : "hover:bg-slate-50/80 cursor-pointer",
                      isToday && "bg-blue-50/30"
                    )}
                    onClick={() => {
                      if (day.day) {
                        setEventosDoDia(dayEvents)
                        setDataSelecionada(day.date)
                        setModalDiaAberto(true)
                      }
                    }}
                  >
                    {day.day && (
                      <>
                        <span className={cn(
                          "text-[11px] font-bold mb-1 block w-6 h-6 leading-6 text-center rounded-full",
                          isToday ? "bg-primary text-white" : "text-slate-500"
                        )}>{day.day}</span>
                        
                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map(e => (
                            <div 
                              key={e.CODATIVIDADE} 
                              className={cn(
                                "text-[9px] px-1 py-0.5 rounded border-l-2 truncate font-medium",
                                e.STATUS === 'REALIZADO' ? "opacity-60 bg-green-50 text-green-700 border-green-600" : "bg-white text-slate-700 border-slate-400 shadow-sm"
                              )}
                              style={{ borderLeftColor: e.STATUS === 'REALIZADO' ? undefined : e.COR }}
                            >
                              {e.STATUS === 'REALIZADO' && <CheckCircle2 className="w-2.5 h-2.5 inline mr-1" />}
                              {e.TITULO}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-[8px] text-slate-400 font-bold pl-1">
                              + {dayEvents.length - 3} tarefas
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modais */}
      <Dialog open={modalDiaAberto} onOpenChange={setModalDiaAberto}>
        <DialogContent className="max-w-md p-0 overflow-hidden" aria-describedby={undefined}>
          <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
            <div>
              <DialogTitle className="text-sm font-bold text-slate-800">
                Tarefas de {dataSelecionada?.toLocaleDateString()}
              </DialogTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setModalDiaAberto(false)}><X className="w-4 h-4" /></Button>
          </div>
          <div className="p-4 space-y-2 max-h-[60vh] overflow-auto">
            {eventosDoDia.length === 0 ? (
              <p className="text-center py-10 text-slate-500 text-sm italic">Nenhuma tarefa para este dia.</p>
            ) : (
              eventosDoDia.map(e => (
                <EventoItem 
                  key={e.CODATIVIDADE} 
                  evento={e} 
                  onUpdate={loadEventos} 
                  onUpdateLocal={(ev) => setEventos(prev => prev.map(p => p.CODATIVIDADE === ev.CODATIVIDADE ? ev : p))}
                  onClose={() => setModalDiaAberto(false)}
                />
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modalNovaAtividadeAberto} onOpenChange={setModalNovaAtividadeAberto}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-[500px] p-0 overflow-hidden">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <DialogHeader className="p-0">
                <DialogTitle>Nova Atividade</DialogTitle>
              </DialogHeader>
              <Button variant="ghost" size="sm" onClick={() => setModalNovaAtividadeAberto(false)} className="md:hidden">
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">Título</Label>
                <Input 
                  placeholder="Ex: Ligar para cliente X" 
                  value={novaAtividade.TITULO} 
                  onChange={e => setNovaAtividade({...novaAtividade, TITULO: e.target.value})} 
                  className="h-10"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">Descrição</Label>
                <Textarea 
                  placeholder="Detalhes da atividade..." 
                  value={novaAtividade.DESCRICAO} 
                  onChange={e => setNovaAtividade({...novaAtividade, DESCRICAO: e.target.value})} 
                  className="min-h-[100px] resize-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label className="text-xs font-bold uppercase text-slate-500">Data</Label>
                   <Input 
                     type="date" 
                     value={novaAtividade.DATA_INICIO} 
                     onChange={e => setNovaAtividade({...novaAtividade, DATA_INICIO: e.target.value, DATA_FIM: e.target.value})} 
                     className="h-10"
                   />
                 </div>
                 <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500">Tipo</Label>
                    <Select value={novaAtividade.TIPO} onValueChange={(val) => setNovaAtividade({...novaAtividade, TIPO: val})}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Selecione"/>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EMAIL">E-mail</SelectItem>
                        <SelectItem value="LIGACAO">Ligação</SelectItem>
                        <SelectItem value="REUNIAO">Reunião</SelectItem>
                        <SelectItem value="VISITA">Visita</SelectItem>
                      </SelectContent>
                    </Select>
                 </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">Cor do Indicador</Label>
                <div className="flex gap-2">
                  {['#22C55E', '#3B82F6', '#EF4444', '#F59E0B', '#8B5CF6', '#64748B'].map(color => (
                    <button
                      key={color}
                      className={cn(
                        "w-8 h-8 rounded-full border-2 transition-all",
                        novaAtividade.COR === color ? "border-slate-950 scale-110 shadow-sm" : "border-transparent"
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => setNovaAtividade({...novaAtividade, COR: color})}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">Vincular Parceiro</Label>
                <Select onValueChange={(val) => setNovaAtividade({...novaAtividade, CODPARC: val})}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Selecione um parceiro (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="max-h-[200px] overflow-y-auto">
                      {parceiros.map((p) => (
                        <SelectItem key={p.CODPARC} value={p.CODPARC.toString()}>
                          {p.CODPARC} - {p.NOMEPARC}
                        </SelectItem>
                      ))}
                    </div>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                className="w-full bg-primary hover:bg-primary/90 h-11 font-bold text-white mt-4" 
                onClick={handleSalvarNova} 
                disabled={salvandoAtividade}
              >
                 {salvandoAtividade ? (
                   <>
                     <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                     Salvando...
                   </>
                 ) : "Criar Tarefa"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modalInativosAberto} onOpenChange={setModalInativosAberto}>
        <DialogContent className="max-w-3xl" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Tarefas Arquivadas</DialogTitle></DialogHeader>
          <div className="space-y-2 mt-4 max-h-[60vh] overflow-auto pr-2">
            {eventosInativos.length === 0 ? <p className="text-center py-10">Nenhuma tarefa arquivada.</p> : 
              eventosInativos.map(e => (
                <div key={e.CODATIVIDADE} className="p-3 border rounded-lg flex justify-between items-center bg-slate-50">
                  <div className="min-w-0 pr-4">
                    <p className="font-semibold text-sm truncate">{e.TITULO}</p>
                    <p className="text-[10px] text-slate-500">{new Date(e.DATA_INICIO).toLocaleDateString()}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleReativar(e.CODATIVIDADE)} disabled={reativando === e.CODATIVIDADE}>Reativar</Button>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}

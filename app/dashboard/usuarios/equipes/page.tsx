'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { 
  Users, 
  Plus, 
  Pencil, 
  Trash2, 
  UserCircle,
  Loader2,
  ArrowLeft,
  Search
} from 'lucide-react'
import Link from 'next/link'

interface Equipe {
  CODEQUIPE: number
  NOME: string
  DESCRICAO: string
  CODUSUARIO_GESTOR: number | null
  NOME_GESTOR: string | null
  ATIVO: string
  DATA_CRIACAO: string
  TOTAL_MEMBROS: number
}

interface Usuario {
  CODUSUARIO: number
  NOME: string
  EMAIL: string
  CODVENDEDOR: number | null
  PERFIL: string
}

interface Membro {
  CODMEMBRO: number
  CODUSUARIO: number
  NOME: string
  EMAIL: string
  CODVENDEDOR: number | null
  PERFIL: string
  ATIVO: string
  DATA_ENTRADA: string
}

export default function EquipesPage() {
  const [equipes, setEquipes] = useState<Equipe[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingEquipe, setEditingEquipe] = useState<Equipe | null>(null)
  const [membrosEquipe, setMembrosEquipe] = useState<number[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    codUsuarioGestor: ''
  })

  const loadEquipes = useCallback(async () => {
    try {
      const response = await fetch('/api/equipes')
      if (!response.ok) throw new Error('Erro ao carregar equipes')
      const data = await response.json()
      setEquipes(data.equipes || [])
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadUsuarios = useCallback(async () => {
    try {
      const response = await fetch('/api/usuarios')
      if (!response.ok) throw new Error('Erro ao carregar usuários')
      const data = await response.json()
      setUsuarios(data.usuarios || [])
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error)
    }
  }, [])

  useEffect(() => {
    loadEquipes()
    loadUsuarios()
  }, [loadEquipes, loadUsuarios])

  const handleOpenModal = async (equipe?: Equipe) => {
    if (equipe) {
      setEditingEquipe(equipe)
      setFormData({
        nome: equipe.NOME,
        descricao: equipe.DESCRICAO || '',
        codUsuarioGestor: equipe.CODUSUARIO_GESTOR?.toString() || ''
      })

      try {
        const response = await fetch(`/api/equipes?codEquipe=${equipe.CODEQUIPE}`)
        if (response.ok) {
          const data = await response.json()
          const membrosIds = (data.membros || [])
            .filter((m: Membro) => m.ATIVO === 'S')
            .map((m: Membro) => m.CODUSUARIO)
          setMembrosEquipe(membrosIds)
        }
      } catch (error) {
        console.error('Erro ao carregar membros:', error)
      }
    } else {
      setEditingEquipe(null)
      setFormData({ nome: '', descricao: '', codUsuarioGestor: '' })
      setMembrosEquipe([])
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingEquipe(null)
    setFormData({ nome: '', descricao: '', codUsuarioGestor: '' })
    setMembrosEquipe([])
  }

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error('Nome da equipe é obrigatório')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...formData,
        codUsuarioGestor: formData.codUsuarioGestor ? parseInt(formData.codUsuarioGestor) : null,
        membros: membrosEquipe,
        ...(editingEquipe && { 
          codEquipe: editingEquipe.CODEQUIPE,
          ativo: editingEquipe.ATIVO 
        })
      }

      const response = await fetch('/api/equipes', {
        method: editingEquipe ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao salvar equipe')
      }

      toast.success(editingEquipe ? 'Equipe atualizada!' : 'Equipe criada!')
      handleCloseModal()
      loadEquipes()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (codEquipe: number) => {
    if (!confirm('Deseja realmente desativar esta equipe?')) return

    try {
      const response = await fetch(`/api/equipes?codEquipe=${codEquipe}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao desativar equipe')
      }

      toast.success('Equipe desativada!')
      loadEquipes()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const toggleMembro = (codUsuario: number) => {
    setMembrosEquipe(prev => 
      prev.includes(codUsuario)
        ? prev.filter(id => id !== codUsuario)
        : [...prev, codUsuario]
    )
  }

  const gestores = usuarios.filter(u => u.PERFIL === 'Gerente' || u.PERFIL === 'Administrador')
  const vendedores = usuarios.filter(u => u.PERFIL === 'Vendedor' || u.CODVENDEDOR)

  const filteredVendedores = vendedores.filter(v =>
    v.NOME.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.EMAIL.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredEquipes = equipes.filter(e => e.ATIVO === 'S')

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/usuarios">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Equipes Comerciais</h1>
          <p className="text-muted-foreground">
            Gerencie as equipes e vincule vendedores aos gestores
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Equipe
        </Button>
      </div>

      {filteredEquipes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhuma equipe cadastrada.<br />
              Clique em "Nova Equipe" para começar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEquipes.map(equipe => (
            <Card key={equipe.CODEQUIPE} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{equipe.NOME}</CardTitle>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleOpenModal(equipe)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(equipe.CODEQUIPE)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {equipe.DESCRICAO && (
                  <p className="text-sm text-muted-foreground">{equipe.DESCRICAO}</p>
                )}
                
                <div className="flex items-center gap-2 text-sm">
                  <UserCircle className="h-4 w-4 text-primary" />
                  <span className="font-medium">Gestor:</span>
                  <span>{equipe.NOME_GESTOR || 'Não definido'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <Badge variant="secondary">
                    <Users className="h-3 w-3 mr-1" />
                    {equipe.TOTAL_MEMBROS} membro(s)
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Criada em {equipe.DATA_CRIACAO}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEquipe ? 'Editar Equipe' : 'Nova Equipe'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Equipe *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={e => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Equipe Sul"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição da equipe..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gestor">Gestor da Equipe</Label>
              <Select
                value={formData.codUsuarioGestor || 'none'}
                onValueChange={value => setFormData({ ...formData, codUsuarioGestor: value === 'none' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o gestor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {gestores.map(g => (
                    <SelectItem key={g.CODUSUARIO} value={g.CODUSUARIO.toString()}>
                      {g.NOME} ({g.PERFIL})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Membros da Equipe (Vendedores)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Buscar vendedor..."
                  className="pl-10"
                />
              </div>
              
              <div className="border rounded-lg max-h-[200px] overflow-y-auto">
                {filteredVendedores.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    Nenhum vendedor encontrado
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredVendedores.map(vendedor => (
                      <div
                        key={vendedor.CODUSUARIO}
                        className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                        onClick={() => toggleMembro(vendedor.CODUSUARIO)}
                      >
                        <Checkbox
                          checked={membrosEquipe.includes(vendedor.CODUSUARIO)}
                          onCheckedChange={() => toggleMembro(vendedor.CODUSUARIO)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{vendedor.NOME}</p>
                          <p className="text-xs text-muted-foreground truncate">{vendedor.EMAIL}</p>
                        </div>
                        {vendedor.CODVENDEDOR && (
                          <Badge variant="outline" className="text-xs">
                            Cód: {vendedor.CODVENDEDOR}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {membrosEquipe.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {membrosEquipe.length} membro(s) selecionado(s)
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingEquipe ? 'Salvar' : 'Criar Equipe'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

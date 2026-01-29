"use client"

import { useState, useEffect, useRef } from "react"
// Adicionado 'Plus' e 'User' (que é usado no código) às importações
import { 
  Search, 
  Pencil, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Plus,
  User as UserIcon,
  X 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClienteDetalhesModal } from "@/components/cliente-detalhes-modal"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { authService } from "@/lib/auth-service"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { OfflineDataService } from '@/lib/offline-data-service'

interface Partner {
  _id: string
  CODPARC: string
  NOMEPARC: string
  CGC_CPF: string
  CODCID?: string
  ATIVO?: string
  TIPPESSOA?: string
  CODVEND?: number
  CLIENTE?: string
}

const ITEMS_PER_PAGE = 50

export default function PartnersTable() {
  const [searchName, setSearchName] = useState("")
  const [searchCode, setSearchCode] = useState("")
  const [appliedSearchName, setAppliedSearchName] = useState("")
  const [appliedSearchCode, setAppliedSearchCode] = useState("")
  const [isDetalhesModalOpen, setIsDetalhesModalOpen] = useState(false)
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null)
  const [partners, setPartners] = useState<Partner[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const { toast } = useToast()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [vendedoresMap, setVendedoresMap] = useState<Record<number, string>>({})
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const loadingRef = useRef(false);
  const [isOffline, setIsOffline] = useState(typeof window !== 'undefined' ? !navigator.onLine : false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      syncDataOnReconnect();
    };
    const handleOffline = () => {
      setIsOffline(true);
      toast({
        title: "Modo Offline",
        description: "Você está sem conexão. Os dados exibidos são do cache.",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  useEffect(() => {
    loadPartners();
  }, [currentPage, appliedSearchName, appliedSearchCode, isOffline]);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) setCurrentUser(user);
    loadVendedores();
  }, []);

  const syncDataOnReconnect = async () => {
    if (isOffline) return;
    try {
      const prefetchResponse = await fetch('/api/prefetch', { method: 'POST' });
      if (prefetchResponse.ok) {
        const prefetchData = await prefetchResponse.json();
        await OfflineDataService.sincronizarTudo(prefetchData);
        toast({ title: "Sincronização Concluída", description: "Dados atualizados com o servidor." });
        await loadPartners();
      }
    } catch (error) {
      console.error('Erro na sincronização:', error);
    }
  };

  const loadVendedores = async () => {
    try {
      const response = await fetch('/api/vendedores?tipo=todos');
      const vendedores = await response.json();
      const map: Record<number, string> = {};
      vendedores.forEach((v: any) => { map[v.CODVEND] = v.APELIDO; });
      setVendedoresMap(map);
    } catch (error) { console.error(error); }
  };

  const handleSearch = () => {
    setAppliedSearchName(searchName);
    setAppliedSearchCode(searchCode);
    setCurrentPage(1);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  };

  const loadPartners = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      setIsLoading(true);
      let allParceiros: Partner[] = await OfflineDataService.getParceiros();

      let filteredParceiros = allParceiros;
      if (appliedSearchName.trim() || appliedSearchCode.trim()) {
        filteredParceiros = allParceiros.filter(p => {
          const matchName = !appliedSearchName || p.NOMEPARC?.toLowerCase().includes(appliedSearchName.toLowerCase());
          const matchCode = !appliedSearchCode || p.CODPARC?.toString().includes(appliedSearchCode);
          return matchName && matchCode;
        });
      }

      const total = filteredParceiros.length;
      const totalPgs = Math.ceil(total / ITEMS_PER_PAGE) || 1;
      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      const paginatedParceiros = filteredParceiros.slice(start, start + ITEMS_PER_PAGE);

      setPartners(paginatedParceiros);
      setTotalPages(totalPgs);
      setTotalRecords(total);
    } catch (error: any) {
      toast({ title: "Erro", description: "Falha ao carregar clientes.", variant: "destructive" });
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  };

  const handleVerDetalhes = (partner: Partner) => {
    setSelectedPartner(partner);
    setIsDetalhesModalOpen(true);
  };

  const getInitials = (name: string) => {
    const words = name.trim().split(' ');
    if (words.length === 0) return '??';
    return (words[0][0] + (words[words.length - 1]?.[0] || '')).toUpperCase();
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden scrollbar-hide">
      {/* Header - Desktop */}
      <div className="hidden md:block border-b p-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
        <p className="text-muted-foreground">
          Consulta e gerenciamento de clientes e parceiros
        </p>
      </div>

      {/* Header - Mobile */}
      <div className="md:hidden border-b px-3 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <h1 className="text-lg font-bold">Clientes</h1>
        <p className="text-xs text-muted-foreground">
          Consulta e gerenciamento de parceiros
        </p>
      </div>

      <div className="flex-1 overflow-hidden">
        {/* Filtros Desktop */}
        <div className="hidden md:block border-b p-6 bg-slate-50">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Filtros de Busca</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Código</Label>
                <Input placeholder="Código..." value={searchCode} onChange={e => setSearchCode(e.target.value)} onKeyPress={handleSearchKeyPress} />
              </div>
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input placeholder="Nome..." value={searchName} onChange={e => setSearchName(e.target.value)} onKeyPress={handleSearchKeyPress} />
              </div>
              <Button onClick={handleSearch} className="self-end bg-primary">
                <Search className="w-4 h-4 mr-2" /> Buscar
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Filtros Mobile */}
        <div className="md:hidden">
          <Collapsible open={filtrosAbertos} onOpenChange={setFiltrosAbertos}>
            <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b">
              <span className="text-sm font-semibold">Filtros</span>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  {filtrosAbertos ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="border-b bg-background">
              <div className="p-4 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="searchCodeMobile" className="text-xs font-medium">
                    Código
                  </Label>
                  <div className="relative">
                    <Input
                      id="searchCodeMobile"
                      type="text"
                      placeholder="Buscar por código"
                      value={searchCode}
                      onChange={(e) => setSearchCode(e.target.value)}
                      onKeyPress={handleSearchKeyPress}
                      className="h-10 pr-9 text-sm"
                    />
                    {searchCode && (
                      <button
                        onClick={() => setSearchCode("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="searchNameMobile" className="text-xs font-medium">
                    Nome
                  </Label>
                  <div className="relative">
                    <Input
                      id="searchNameMobile"
                      type="text"
                      placeholder="Buscar por nome"
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      onKeyPress={handleSearchKeyPress}
                      className="h-10 pr-9 text-sm"
                    />
                    {searchName && (
                      <button
                        onClick={() => setSearchName("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchName("")
                      setSearchCode("")
                      setAppliedSearchName("")
                      setAppliedSearchCode("")
                      setCurrentPage(1)
                      setFiltrosAbertos(false)
                    }}
                    className="flex-1 h-10 text-sm"
                  >
                    Limpar
                  </Button>
                  <Button
                    onClick={() => {
                      handleSearch()
                      setFiltrosAbertos(false)
                    }}
                    disabled={isLoading}
                    className="flex-[2] h-10 text-sm bg-primary"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    {isLoading ? 'Buscando...' : 'Aplicar Filtros'}
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {(appliedSearchName || appliedSearchCode) && (
          <div className="md:hidden flex items-center gap-2 p-2 bg-blue-50/50 border-b overflow-x-auto whitespace-nowrap scrollbar-hide">
            <span className="text-[10px] font-bold text-blue-700 uppercase ml-2">Ativos:</span>
            {appliedSearchCode && (
              <Badge variant="secondary" className="bg-white text-blue-700 border-blue-200 text-[10px] py-0 px-2 flex items-center gap-1">
                Cód: {appliedSearchCode}
                <X 
                  className="w-3 h-3 cursor-pointer" 
                  onClick={() => {
                    setSearchCode("")
                    setAppliedSearchCode("")
                    setCurrentPage(1)
                  }} 
                />
              </Badge>
            )}
            {appliedSearchName && (
              <Badge variant="secondary" className="bg-white text-blue-700 border-blue-200 text-[10px] py-0 px-2 flex items-center gap-1">
                Nome: {appliedSearchName}
                <X 
                  className="w-3 h-3 cursor-pointer" 
                  onClick={() => {
                    setSearchName("")
                    setAppliedSearchName("")
                    setCurrentPage(1)
                  }} 
                />
              </Badge>
            )}
          </div>
        )}

        {/* Lista / Tabela */}
        <div className="h-[calc(100%-140px)] overflow-auto p-4">
          {isLoading ? (
            <div className="flex flex-col items-center py-20 gap-2">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"/>
              <p className="text-sm text-muted-foreground">Carregando...</p>
            </div>
          ) : (
            <>
              {/* Tabela Desktop */}
              <div className="hidden md:block border rounded-lg overflow-hidden bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800 text-white">
                    <tr>
                      <th className="p-4 text-left font-semibold">Código</th>
                      <th className="p-4 text-left font-semibold">Nome</th>
                      <th className="p-4 text-left font-semibold">CPF/CNPJ</th>
                      <th className="p-4 text-center font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {partners.map(p => (
                      <tr key={p.CODPARC} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-mono text-xs">{p.CODPARC}</td>
                        <td className="p-4 font-medium">{p.NOMEPARC}</td>
                        <td className="p-4 text-muted-foreground">{p.CGC_CPF || '-'}</td>
                        <td className="p-4 text-center">
                          <Button size="sm" variant="outline" onClick={() => handleVerDetalhes(p)}>Detalhes</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cards Mobile */}
              <div className="md:hidden space-y-3">
                {partners.map(p => (
                  <div key={p.CODPARC} onClick={() => handleVerDetalhes(p)} className="p-4 bg-white border rounded-lg flex items-center gap-3 active:bg-slate-50 transition-colors shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {getInitials(p.NOMEPARC)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{p.NOMEPARC}</p>
                      <p className="text-xs text-muted-foreground">{p.CGC_CPF || 'Sem documento'}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground"/>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Paginação */}
      <div className="p-4 border-t bg-white flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>
          <ChevronLeft className="w-4 h-4 mr-1"/> Anterior
        </Button>
        <span className="text-xs text-muted-foreground">Pág. {currentPage} de {totalPages}</span>
        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>
          Próxima <ChevronRight className="w-4 h-4 ml-1"/>
        </Button>
      </div>

      <ClienteDetalhesModal
        isOpen={isDetalhesModalOpen}
        onClose={() => setIsDetalhesModalOpen(false)}
        cliente={selectedPartner}
      />
    </div>
  );
}
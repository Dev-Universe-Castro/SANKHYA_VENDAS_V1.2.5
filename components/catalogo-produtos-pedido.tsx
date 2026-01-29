"use client"

import { useState, useEffect, useMemo } from "react"
import { Search, Plus, Grid3x3, List } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { OfflineDataService } from "@/lib/offline-data-service"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ConfiguracaoProdutoModal, ConfiguracaoProduto, UnidadeVolume } from "@/components/configuracao-produto-modal"

interface CatalogoProdutosPedidoProps {
  onAdicionarItem: (produto: any, quantidade: number, desconto?: number) => void
  tabelaPreco?: string
  tabelasPrecos?: any[]
  itensCarrinho: any[]
  onAbrirCarrinho?: () => void
  isPedidoLeadMobile?: boolean
  codParc?: string | number
  isLeadMode?: boolean
}

export function CatalogoProdutosPedido({
  onAdicionarItem,
  tabelaPreco,
  tabelasPrecos = [],
  itensCarrinho = [],
  onAbrirCarrinho,
  isPedidoLeadMobile = false,
  codParc,
  isLeadMode = false
}: CatalogoProdutosPedidoProps) {
  const [produtos, setProdutos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [busca, setBusca] = useState("")
  const [buscaAplicada, setBuscaAplicada] = useState("")
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("TODAS")
  const [categorias, setCategorias] = useState<string[]>([])
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [produtoPrecos, setProdutoPrecos] = useState<any>(null)
  const [showPrecosModal, setShowPrecosModal] = useState(false)
  const [produtoSelecionadoConfig, setProdutoSelecionadoConfig] = useState<any>(null)
  const [showConfigProdutoModal, setShowConfigProdutoModal] = useState(false)
  const [unidadesProdutoConfig, setUnidadesProdutoConfig] = useState<UnidadeVolume[]>([])
  const [configProdutoInicial, setConfigProdutoInicial] = useState<Partial<ConfiguracaoProduto>>({
    quantidade: 1,
    desconto: 0,
    unidade: 'UN',
    preco: 0
  })
  const ITENS_POR_PAGINA = 12

  useEffect(() => {
    carregarProdutos()
  }, [tabelaPreco, codParc])

  const carregarPrecosEmChunks = async (produtosIniciais: any[], nutab: number) => {
    const chunkSize = 20; // Chunk menor para ser mais rápido na resposta visual
    let produtosAtuais = [...produtosIniciais];
    
    // Priorizar apenas os produtos da primeira página para carregar preço IMEDIATAMENTE
    const primeiraPagina = produtosAtuais.slice(0, ITENS_POR_PAGINA);
    const primeiraPaginaComPrecos = await Promise.all(primeiraPagina.map(async (p: any) => {
      try {
        const precos = await OfflineDataService.getPrecos(Number(p.CODPROD), nutab);
        if (precos.length > 0 && precos[0].VLRVENDA) {
          return { ...p, preco: parseFloat(String(precos[0].VLRVENDA).replace(/,/g, '.')) };
        }
      } catch (e) {}
      return p;
    }));
    
    produtosAtuais.splice(0, ITENS_POR_PAGINA, ...primeiraPaginaComPrecos);
    setProdutos([...produtosAtuais]);

    // Carregar o restante em background
    setTimeout(async () => {
      for (let i = ITENS_POR_PAGINA; i < produtosAtuais.length; i += chunkSize) {
        const chunk = produtosAtuais.slice(i, i + chunkSize);
        const chunkComPrecos = await Promise.all(chunk.map(async (p: any) => {
          try {
            const precos = await OfflineDataService.getPrecos(Number(p.CODPROD), nutab);
            if (precos.length > 0 && precos[0].VLRVENDA) {
              return { ...p, preco: parseFloat(String(precos[0].VLRVENDA).replace(/,/g, '.')) };
            }
          } catch (e) {}
          return p;
        }));
        
        produtosAtuais.splice(i, chunk.length, ...chunkComPrecos);
        setProdutos([...produtosAtuais]);
        await new Promise(resolve => setTimeout(resolve, 30));
      }
    }, 100);
  };

  const carregarProdutos = async () => {
    setLoading(true)
    try {
      const produtosData = await OfflineDataService.getProdutos()
      
      const produtosComDados = produtosData.map((produto: any) => ({
        ...produto,
        preco: parseFloat(produto.AD_VLRUNIT || 0)
      }))

      setProdutos(produtosComDados)
      setLoading(false)

      const categoriasUnicas = [...new Set(produtosComDados.map(p => p.MARCA || 'SEM MARCA').filter(Boolean))] as string[]
      setCategorias(['TODAS', ...categoriasUnicas.sort()])

      // Só carregar preços se NÃO for modo Lead
      if (!isLeadMode) {
        let nutabAlvo = 0;
        if (codParc) {
          const parceiros = await OfflineDataService.getParceiros();
          const parceiro = parceiros.find((p: any) => String(p.CODPARC) === String(codParc));
          if (parceiro) {
            nutabAlvo = Number(parceiro.NUTAB || parceiro.CODTAB || 0);
          }
        }

        if (!nutabAlvo && tabelaPreco) {
          const tab = tabelasPrecos.find(t => String(t.CODTAB) === String(tabelaPreco));
          nutabAlvo = Number(tab?.NUTAB || 0);
        }

        if (nutabAlvo > 0) {
          carregarPrecosEmChunks(produtosComDados, nutabAlvo);
        }
      }
    } catch (error) {
      console.error('Erro:', error)
      setLoading(false)
    }
  }

  const normalizarTexto = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

  const produtosFiltrados = useMemo(() => {
    return produtos.filter(produto => {
      const buscaNormalizada = normalizarTexto(buscaAplicada)
      const matchBusca = buscaAplicada === "" || 
                        normalizarTexto(produto.DESCRPROD || '').includes(buscaNormalizada) || 
                        produto.CODPROD?.toString().includes(buscaAplicada)
      const matchCategoria = categoriaFiltro === "TODAS" || (produto.MARCA || 'SEM MARCA') === categoriaFiltro
      return matchBusca && matchCategoria
    })
  }, [produtos, buscaAplicada, categoriaFiltro])

  const totalPaginas = Math.ceil(produtosFiltrados.length / ITENS_POR_PAGINA)
  const produtosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA
    return produtosFiltrados.slice(inicio, inicio + ITENS_POR_PAGINA)
  }, [produtosFiltrados, paginaAtual])

  useEffect(() => { setPaginaAtual(1) }, [buscaAplicada, categoriaFiltro])

  const handleSelecionarProdutoConfig = async (produto: any) => {
    console.log('🛍️ Selecionando produto para config:', produto.CODPROD);
    setLoading(true)
    try {
      const codProdNumber = Number(produto.CODPROD)
      let nutabAlvo = 0;
      if (codParc) {
        const parceiros = await OfflineDataService.getParceiros();
        const parceiro = parceiros.find((p: any) => String(p.CODPARC) === String(codParc));
        nutabAlvo = Number(parceiro?.NUTAB || parceiro?.CODTAB || 0);
      }
      
      const precos = await OfflineDataService.getPrecos(codProdNumber)
      let precoFinal = parseFloat(produto.AD_VLRUNIT || 0)
      if (nutabAlvo > 0) {
        const pr = precos.find(p => Number(p.NUTAB) === nutabAlvo)
        if (pr?.VLRVENDA) precoFinal = parseFloat(String(pr.VLRVENDA).replace(/,/g, '.'))
      }
      
      const volumes = await OfflineDataService.getVolumes(produto.CODPROD)
      const unidades: UnidadeVolume[] = [
        { CODVOL: produto.UNIDADE || 'UN', DESCRICAO: `${produto.UNIDADE || 'UN'} - Padrão`, QUANTIDADE: 1, isPadrao: true },
        ...volumes.filter((v: any) => v.ATIVO === 'S').map((v: any) => ({ CODVOL: v.CODVOL, DESCRICAO: v.DESCRDANFE || v.CODVOL, QUANTIDADE: v.QUANTIDADE || 1, isPadrao: false }))
      ]
      
      console.log('📦 Unidades carregadas:', unidades.length);
      setUnidadesProdutoConfig(unidades)
      setConfigProdutoInicial({ quantidade: 1, desconto: 0, unidade: produto.UNIDADE || 'UN', preco: precoFinal })
      setProdutoSelecionadoConfig({ ...produto, preco: precoFinal })
      setShowConfigProdutoModal(true)
      console.log('🚀 Modal deve abrir agora');
    } catch (e) { 
      console.error('❌ Erro ao abrir modal de config:', e);
      toast.error('Erro ao carregar detalhes do produto');
    } finally { 
      setLoading(false) 
    }
  }

  const handleVerPrecos = async (produto: any) => {
    try {
      const tabelasConfig = await OfflineDataService.getTabelasPrecosConfig()
      const allTabelas = await OfflineDataService.getTabelasPrecos()
      
      // Combinar tabelas de configuração com todas as tabelas
      const tabelasParaConsultar = tabelasPrecos.length > 0 ? tabelasPrecos : (tabelasConfig.length > 0 ? tabelasConfig : allTabelas);

      const precosData = await Promise.all(tabelasParaConsultar.map(async (tabela: any) => {
        const precos = await OfflineDataService.getPrecos(Number(produto.CODPROD))
        const pr = precos.find(p => Number(p.NUTAB) === Number(tabela.NUTAB))
        return { 
          tabela: tabela.DESCRICAO || `Tabela ${tabela.CODTAB}`, 
          preco: pr?.VLRVENDA ? parseFloat(String(pr.VLRVENDA).replace(/,/g, '.')) : 0 
        }
      }))
      setProdutoPrecos({ produto, precos: precosData.filter(p => p.preco > 0) })
      setShowPrecosModal(true)
    } catch (e) { 
      console.error('Erro ao buscar preços:', e);
      toast.error('Erro ao buscar preços');
    }
  }

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const handleConfirmarProduto = (config: ConfiguracaoProduto) => {
    if (!produtoSelecionadoConfig) return
    const vlrSubtotal = config.preco * config.quantidade
    const vlrTotal = vlrSubtotal * (1 - config.desconto / 100)
    onAdicionarItem({ ...produtoSelecionadoConfig, CODVOL: config.unidade, VLRUNIT: config.preco, preco: config.preco, VLRTOT: vlrTotal, PERCDESC: config.desconto, QTDNEG: config.quantidade }, config.quantidade, config.desconto)
    toast.success("Produto adicionado")
    setShowConfigProdutoModal(false)
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex gap-2 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar produtos..." value={busca} onChange={(e) => setBusca(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && setBuscaAplicada(busca)} className="pl-10" />
        </div>
        <Button onClick={() => setBuscaAplicada(busca)} className="bg-green-600 hover:bg-green-700">Filtrar</Button>
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-1">
            {produtosPaginados.map((p) => (
              <Card key={p.CODPROD} className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 flex flex-col h-full">
                  <p className="text-xs text-muted-foreground font-mono">#{p.CODPROD}</p>
                  <h4 className="font-semibold text-sm line-clamp-2 min-h-[40px]">{p.DESCRPROD}</h4>
                  <div className="mt-auto pt-2">
                    {!isLeadMode && (
                      <span className="text-lg font-bold text-green-600">{formatCurrency(p.preco)}</span>
                    )}
                    <Button size="sm" onClick={() => handleSelecionarProdutoConfig(p)} className="w-full bg-green-600 hover:bg-green-700 h-8 mt-2"><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {!loading && totalPaginas > 1 && (
          <div className="flex justify-center gap-2 mt-6 pb-4">
            <Button variant="outline" size="sm" disabled={paginaAtual === 1} onClick={() => setPaginaAtual(p => p - 1)}>Anterior</Button>
            <span className="text-sm self-center">Pág {paginaAtual} / {totalPaginas}</span>
            <Button variant="outline" size="sm" disabled={paginaAtual === totalPaginas} onClick={() => setPaginaAtual(p => p + 1)}>Próxima</Button>
          </div>
        )}
      </ScrollArea>

      <ConfiguracaoProdutoModal 
        open={showConfigProdutoModal} 
        onOpenChange={setShowConfigProdutoModal} 
        onConfirmar={handleConfirmarProduto} 
        produto={produtoSelecionadoConfig} 
        unidades={unidadesProdutoConfig} 
        configInicial={configProdutoInicial} 
        onVerPrecos={() => handleVerPrecos(produtoSelecionadoConfig)} 
      />
      
      <Dialog open={showPrecosModal} onOpenChange={setShowPrecosModal}>
        <DialogContent><DialogHeader><DialogTitle>Tabelas de Preço</DialogTitle></DialogHeader>
          <div className="space-y-2">{produtoPrecos?.precos.map((p: any, i: number) => (<div key={i} className="flex justify-between p-2 border-b last:border-0"><span className="text-sm">{p.tabela}</span><span className="font-bold text-green-600">{formatCurrency(p.preco)}</span></div>))}</div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


import Dexie, { Table } from 'dexie';

class SankhyaOfflineDB extends Dexie {
  produtos!: Table<any>;
  parceiros!: Table<any>;
  financeiro!: Table<any>;
  tiposNegociacao!: Table<any>;
  tiposOperacao!: Table<any>;
  tiposPedido!: Table<any>;
  estoque!: Table<any>;
  precos!: Table<any>;
  tabelasPrecos!: Table<any>;
  tabelasPrecosConfig!: Table<any>;
  pedidosPendentes!: Table<any>;
  pedidos!: Table<any>;
  usuarios!: Table<any>;
  vendedores!: Table<any>;
  volumes!: Table<any>;
  metadados!: Table<any>;
  rotas!: Table<any>;
  rotasParceiros!: Table<any>;
  visitasPendentes!: Table<any>;
  visitas!: Table<any>;
  visitaIdMappings!: Table<any>;
  regrasImpostos!: Table<any>;
  acessosUsuario!: Table<any>;
  acessosClientes!: Table<any>;
  acessosProdutos!: Table<any>;
  equipes!: Table<any>;
  equipesMembros!: Table<any>;

  constructor() {
    super('SankhyaOfflineDB');
    
    // Versão 12 - adiciona tabelas de acessos e equipes
    this.version(12).stores({
      produtos: 'CODPROD, DESCRPROD, ATIVO',
      parceiros: 'CODPARC, NOMEPARC, CODVEND, CGC_CPF, CODTAB',
      financeiro: 'NUFIN, CODPARC, DTVENC, RECDESP',
      tiposNegociacao: 'CODTIPVENDA',
      tiposOperacao: 'CODTIPOPER',
      tiposPedido: 'CODTIPOPEDIDO, CODTIPOPER',
      estoque: '[CODPROD+CODLOCAL], CODPROD, CODLOCAL',
      precos: '[CODPROD+NUTAB], CODPROD, NUTAB',
      tabelasPrecos: 'NUTAB, CODTAB',
      tabelasPrecosConfig: 'CODCONFIG, NUTAB',
      pedidosPendentes: '++id, synced, createdAt',
      pedidos: 'NUNOTA, CODPARC, CODVEND, DTNEG',
      usuarios: 'CODUSUARIO, &EMAIL, username, NOME, FUNCAO, STATUS, passwordHash',
      vendedores: 'CODVEND, APELIDO, ATIVO',
      volumes: '[CODPROD+CODVOL], CODPROD, CODVOL, ATIVO',
      metadados: 'chave',
      rotas: 'CODROTA, CODVEND, ATIVO',
      rotasParceiros: '++id, CODROTA, CODPARC, ORDEM',
      visitasPendentes: '++id, synced, createdAt, action, CODPARC, localVisitaId',
      visitas: 'CODVISITA, CODROTA, CODPARC, CODVEND, DATA_VISITA, STATUS',
      visitaIdMappings: '&localVisitaId, codVisita, createdAt',
      regrasImpostos: 'ID_REGRA, NOME, ATIVO',
      acessosUsuario: 'CODUSUARIO',
      acessosClientes: '++id, CODUSUARIO, CODPARC',
      acessosProdutos: '++id, CODUSUARIO, CODPROD',
      equipes: 'CODEQUIPE, CODUSUARIO_GESTOR, ATIVO',
      equipesMembros: '++id, CODEQUIPE, CODUSUARIO'
    });
  }
}

export const db = new SankhyaOfflineDB();

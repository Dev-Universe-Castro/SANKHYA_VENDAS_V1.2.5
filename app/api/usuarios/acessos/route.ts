import { NextResponse } from 'next/server';
import { oracleService } from '@/lib/oracle-db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const codUsuario = searchParams.get('codUsuario');

    if (!codUsuario) {
      return NextResponse.json(
        { error: 'Código do usuário é obrigatório' },
        { status: 400 }
      );
    }

    const sql = `
      SELECT 
        CODUSUARIO,
        ACESSO_CLIENTES,
        ACESSO_PRODUTOS,
        ACESSO_TAREFAS,
        ACESSO_ADMINISTRACAO,
        ACESSO_USUARIOS,
        TELA_PEDIDOS_VENDAS,
        TELA_ROTAS,
        TELA_TAREFAS,
        TELA_NEGOCIOS,
        TELA_CLIENTES,
        TELA_PRODUTOS,
        TELA_TABELA_PRECOS,
        TELA_USUARIOS,
        TELA_ADMINISTRACAO
      FROM AD_ACESSOS_USUARIO
      WHERE CODUSUARIO = :codUsuario
    `;

    const result = await oracleService.executeQuery(sql, { codUsuario: parseInt(codUsuario) });

    if (result && result.length > 0) {
      return NextResponse.json(result[0]);
    }

    return NextResponse.json({
      CODUSUARIO: parseInt(codUsuario),
      ACESSO_CLIENTES: 'VINCULADO',
      ACESSO_PRODUTOS: 'TODOS',
      ACESSO_TAREFAS: 'VINCULADO',
      ACESSO_ADMINISTRACAO: 'N',
      ACESSO_USUARIOS: 'N',
      TELA_PEDIDOS_VENDAS: 'S',
      TELA_ROTAS: 'S',
      TELA_TAREFAS: 'S',
      TELA_NEGOCIOS: 'S',
      TELA_CLIENTES: 'S',
      TELA_PRODUTOS: 'S',
      TELA_TABELA_PRECOS: 'S',
      TELA_USUARIOS: 'N',
      TELA_ADMINISTRACAO: 'N'
    });

  } catch (error: any) {
    console.error('Erro ao buscar acessos do usuário:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar acessos' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('📥 Salvando acessos do usuário:', body);

    const {
      codUsuario,
      acessoClientes,
      acessoProdutos,
      acessoTarefas,
      acessoAdministracao,
      acessoUsuarios,
      telaPedidosVendas,
      telaRotas,
      telaTarefas,
      telaNegocios,
      telaClientes,
      telaProdutos,
      telaTabelaPrecos,
      telaUsuarios,
      telaAdministracao
    } = body;

    if (!codUsuario) {
      return NextResponse.json(
        { error: 'Código do usuário é obrigatório' },
        { status: 400 }
      );
    }

    const checkSql = `SELECT COUNT(*) AS TOTAL FROM AD_ACESSOS_USUARIO WHERE CODUSUARIO = :codUsuario`;
    const checkResult = await oracleService.executeQuery(checkSql, { codUsuario });
    const exists = checkResult && checkResult[0] && checkResult[0].TOTAL > 0;

    if (exists) {
      const updateSql = `
        UPDATE AD_ACESSOS_USUARIO SET
          ACESSO_CLIENTES = :acessoClientes,
          ACESSO_PRODUTOS = :acessoProdutos,
          ACESSO_TAREFAS = :acessoTarefas,
          ACESSO_ADMINISTRACAO = :acessoAdministracao,
          ACESSO_USUARIOS = :acessoUsuarios,
          TELA_PEDIDOS_VENDAS = :telaPedidosVendas,
          TELA_ROTAS = :telaRotas,
          TELA_TAREFAS = :telaTarefas,
          TELA_NEGOCIOS = :telaNegocios,
          TELA_CLIENTES = :telaClientes,
          TELA_PRODUTOS = :telaProdutos,
          TELA_TABELA_PRECOS = :telaTabelaPrecos,
          TELA_USUARIOS = :telaUsuarios,
          TELA_ADMINISTRACAO = :telaAdministracao,
          DTALTERACAO = SYSDATE
        WHERE CODUSUARIO = :codUsuario
      `;

      await oracleService.executeQuery(updateSql, {
        codUsuario,
        acessoClientes: acessoClientes || 'VINCULADO',
        acessoProdutos: acessoProdutos || 'TODOS',
        acessoTarefas: acessoTarefas || 'VINCULADO',
        acessoAdministracao: acessoAdministracao ? 'S' : 'N',
        acessoUsuarios: acessoUsuarios ? 'S' : 'N',
        telaPedidosVendas: telaPedidosVendas ? 'S' : 'N',
        telaRotas: telaRotas ? 'S' : 'N',
        telaTarefas: telaTarefas ? 'S' : 'N',
        telaNegocios: telaNegocios ? 'S' : 'N',
        telaClientes: telaClientes ? 'S' : 'N',
        telaProdutos: telaProdutos ? 'S' : 'N',
        telaTabelaPrecos: telaTabelaPrecos ? 'S' : 'N',
        telaUsuarios: telaUsuarios ? 'S' : 'N',
        telaAdministracao: telaAdministracao ? 'S' : 'N'
      });

      console.log('✅ Acessos atualizados com sucesso');
    } else {
      const insertSql = `
        INSERT INTO AD_ACESSOS_USUARIO (
          CODUSUARIO,
          ACESSO_CLIENTES,
          ACESSO_PRODUTOS,
          ACESSO_TAREFAS,
          ACESSO_ADMINISTRACAO,
          ACESSO_USUARIOS,
          TELA_PEDIDOS_VENDAS,
          TELA_ROTAS,
          TELA_TAREFAS,
          TELA_NEGOCIOS,
          TELA_CLIENTES,
          TELA_PRODUTOS,
          TELA_TABELA_PRECOS,
          TELA_USUARIOS,
          TELA_ADMINISTRACAO
        ) VALUES (
          :codUsuario,
          :acessoClientes,
          :acessoProdutos,
          :acessoTarefas,
          :acessoAdministracao,
          :acessoUsuarios,
          :telaPedidosVendas,
          :telaRotas,
          :telaTarefas,
          :telaNegocios,
          :telaClientes,
          :telaProdutos,
          :telaTabelaPrecos,
          :telaUsuarios,
          :telaAdministracao
        )
      `;

      await oracleService.executeQuery(insertSql, {
        codUsuario,
        acessoClientes: acessoClientes || 'VINCULADO',
        acessoProdutos: acessoProdutos || 'TODOS',
        acessoTarefas: acessoTarefas || 'VINCULADO',
        acessoAdministracao: acessoAdministracao ? 'S' : 'N',
        acessoUsuarios: acessoUsuarios ? 'S' : 'N',
        telaPedidosVendas: telaPedidosVendas ? 'S' : 'N',
        telaRotas: telaRotas ? 'S' : 'N',
        telaTarefas: telaTarefas ? 'S' : 'N',
        telaNegocios: telaNegocios ? 'S' : 'N',
        telaClientes: telaClientes ? 'S' : 'N',
        telaProdutos: telaProdutos ? 'S' : 'N',
        telaTabelaPrecos: telaTabelaPrecos ? 'S' : 'N',
        telaUsuarios: telaUsuarios ? 'S' : 'N',
        telaAdministracao: telaAdministracao ? 'S' : 'N'
      });

      console.log('✅ Acessos criados com sucesso');
    }

    return NextResponse.json({ success: true, message: 'Acessos salvos com sucesso' });

  } catch (error: any) {
    console.error('❌ Erro ao salvar acessos:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao salvar acessos' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';

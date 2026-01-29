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
        ac.CODPARC,
        p.NOMEPARC,
        p.CGC_CPF,
        p.TIPPESSOA
      FROM AD_ACESSOS_CLIENTES ac
      INNER JOIN TGFPAR p ON p.CODPARC = ac.CODPARC
      WHERE ac.CODUSUARIO = :codUsuario
      ORDER BY p.NOMEPARC
    `;

    const result = await oracleService.executeQuery(sql, { codUsuario: parseInt(codUsuario) });
    return NextResponse.json({ clientes: result || [] });

  } catch (error: any) {
    console.error('Erro ao buscar clientes manuais:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar clientes' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { codUsuario, clientes } = body;

    if (!codUsuario) {
      return NextResponse.json(
        { error: 'Código do usuário é obrigatório' },
        { status: 400 }
      );
    }

    const deleteSql = `DELETE FROM AD_ACESSOS_CLIENTES WHERE CODUSUARIO = :codUsuario`;
    await oracleService.executeQuery(deleteSql, { codUsuario });

    if (clientes && clientes.length > 0) {
      for (const codParc of clientes) {
        const insertSql = `
          INSERT INTO AD_ACESSOS_CLIENTES (CODUSUARIO, CODPARC)
          VALUES (:codUsuario, :codParc)
        `;
        await oracleService.executeQuery(insertSql, { codUsuario, codParc });
      }
    }

    console.log(`✅ Clientes manuais salvos para usuário ${codUsuario}: ${clientes?.length || 0} clientes`);
    return NextResponse.json({ success: true, message: 'Clientes salvos com sucesso' });

  } catch (error: any) {
    console.error('❌ Erro ao salvar clientes manuais:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao salvar clientes' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';

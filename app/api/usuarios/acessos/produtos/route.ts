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
        ap.CODPROD,
        p.DESCRPROD,
        p.CODVOL
      FROM AD_ACESSOS_PRODUTOS ap
      INNER JOIN TGFPRO p ON p.CODPROD = ap.CODPROD
      WHERE ap.CODUSUARIO = :codUsuario
      ORDER BY p.DESCRPROD
    `;

    const result = await oracleService.executeQuery(sql, { codUsuario: parseInt(codUsuario) });
    return NextResponse.json({ produtos: result || [] });

  } catch (error: any) {
    console.error('Erro ao buscar produtos manuais:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar produtos' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { codUsuario, produtos } = body;

    if (!codUsuario) {
      return NextResponse.json(
        { error: 'Código do usuário é obrigatório' },
        { status: 400 }
      );
    }

    const deleteSql = `DELETE FROM AD_ACESSOS_PRODUTOS WHERE CODUSUARIO = :codUsuario`;
    await oracleService.executeQuery(deleteSql, { codUsuario });

    if (produtos && produtos.length > 0) {
      for (const codProd of produtos) {
        const insertSql = `
          INSERT INTO AD_ACESSOS_PRODUTOS (CODUSUARIO, CODPROD)
          VALUES (:codUsuario, :codProd)
        `;
        await oracleService.executeQuery(insertSql, { codUsuario, codProd });
      }
    }

    console.log(`✅ Produtos manuais salvos para usuário ${codUsuario}: ${produtos?.length || 0} produtos`);
    return NextResponse.json({ success: true, message: 'Produtos salvos com sucesso' });

  } catch (error: any) {
    console.error('❌ Erro ao salvar produtos manuais:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao salvar produtos' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';

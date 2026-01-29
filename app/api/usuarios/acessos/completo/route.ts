import { NextResponse } from 'next/server';
import { accessControlService } from '@/lib/access-control-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const codUsuario = searchParams.get('codUsuario');
    const idEmpresa = searchParams.get('idEmpresa') || '1';

    if (!codUsuario) {
      return NextResponse.json(
        { error: 'Código do usuário é obrigatório' },
        { status: 400 }
      );
    }

    const fullAccess = await accessControlService.getFullUserAccess(
      parseInt(codUsuario),
      parseInt(idEmpresa)
    );

    return NextResponse.json(fullAccess);

  } catch (error: any) {
    console.error('Erro ao buscar acessos completos do usuário:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar acessos' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';

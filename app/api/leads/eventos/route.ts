
import { NextResponse } from 'next/server';
import { consultarAtividades } from '@/lib/oracle-leads-service';

// Desabilitar cache para esta rota
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const codLead = searchParams.get('codLead') || '';
    const idEmpresaStr = searchParams.get('idEmpresa');
    const ativo = searchParams.get('ativo') || 'S';
    const codUsuarioParam = searchParams.get('codUsuario');

    console.log('📥 Consultando eventos', codLead ? `para lead: ${codLead}` : 'de todos os leads', codUsuarioParam ? `para usuário: ${codUsuarioParam}` : '');

    // Importar serviços necessários
    const { cookies } = await import('next/headers');
    const { accessControlService } = await import('@/lib/access-control-service');

    // Obter usuário do cookie
    const cookieStore = cookies();
    const userCookie = cookieStore.get('user');

    let usuarioLogado: any;
    if (userCookie?.value) {
      try {
        usuarioLogado = JSON.parse(userCookie.value);
        console.log('✅ Usuário obtido do cookie:', { id: usuarioLogado.id, name: usuarioLogado.name, role: usuarioLogado.role, idEmpresa: usuarioLogado.idEmpresa });
      } catch (e) {
        console.error('Erro ao parsear cookie de usuário:', e);
      }
    }

    // Se for admin pelo cookie, podemos pular a validação rígida ou permitir acesso total
    const isAdminByCookie = usuarioLogado?.role === 'Administrador' || usuarioLogado?.role === 'ADMIN';

    // Se não tiver usuário no cookie e não passou codUsuarioParam, retornar erro
    if (!usuarioLogado && !codUsuarioParam) {
      return new Response(JSON.stringify({ error: 'Usuário não autenticado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const idEmpresa = usuarioLogado?.idEmpresa || (idEmpresaStr ? parseInt(idEmpresaStr) : 1);

    // Determinar filtro de usuários baseado no perfil
    let filtroUsuarios: number[] = [];

    if (isAdminByCookie) {
      // Admin vê tudo - sem filtro
      console.log('🔓 Administrador - Listando todos os eventos');
      filtroUsuarios = []; // Vazio para não filtrar por CODUSUARIO no service
    } else {
      // Validar acesso do usuário
      const { accessControlService } = await import('@/lib/access-control-service');
      const userAccess = await accessControlService.validateUserAccess(
        usuarioLogado?.id || parseInt(codUsuarioParam || '0'),
        idEmpresa
      );
      console.log('🔐 Acesso validado:', userAccess);

      if (userAccess && userAccess.vendedoresEquipe && userAccess.vendedoresEquipe.length > 0) {
        // Gerente vê seus eventos + eventos dos vendedores da equipe
        console.log('👔 Gerente - Listando eventos da equipe');

        // Buscar CODUSUARIO de todos os vendedores da equipe
        const { oracleService } = await import('@/lib/oracle-db');
        const vendedoresEquipe = [userAccess.codVendedor, ...userAccess.vendedoresEquipe];

        const usuariosSql = `
          SELECT CODUSUARIO 
          FROM AD_USUARIOSVENDAS 
          WHERE CODVEND IN (${vendedoresEquipe.join(',')})
            AND ID_EMPRESA = :idEmpresa
            AND STATUS = 'ativo'
        `;

        const usuarios = await oracleService.executeQuery(usuariosSql, { idEmpresa });
        filtroUsuarios = usuarios.map((u: any) => u.CODUSUARIO);

        console.log(`✅ Gerente pode ver eventos de ${filtroUsuarios.length} usuários:`, filtroUsuarios);
      } else if (userAccess) {
        // Vendedor comum vê apenas seus próprios eventos
        console.log('💼 Vendedor - Listando apenas eventos próprios');
        filtroUsuarios = [userAccess.userId];
      }
    }

    // Passar filtro de usuários para a consulta
    console.log('🔍 [API/Eventos] Chamando consultarAtividades com:', {
      codLead,
      idEmpresa,
      ativo,
      codUsuarioParam,
      filtroUsuarios
    });
    
    let codUsuarioNum: number | undefined = undefined;
    if (codUsuarioParam && codUsuarioParam !== 'undefined' && codUsuarioParam !== 'null') {
      codUsuarioNum = parseInt(codUsuarioParam);
    }

    const atividades = await consultarAtividades(
      codLead, 
      idEmpresa, 
      ativo, 
      isAdminByCookie ? undefined : (codUsuarioNum || undefined),
      filtroUsuarios.length > 0 ? filtroUsuarios : undefined,
      isAdminByCookie
    );

    // Debug do resultado para entender por que retorna 0
    console.log(`📊 [API/Eventos] Resultado consultarAtividades: ${atividades.length} atividades`);
    if (atividades.length === 0 && userAccess.isAdmin) {
      console.log('❓ [API/Eventos] Admin não retornou nada. Verificando dados na tabela...');
    }

    // Serializar manualmente para evitar referências circulares
    const atividadesSerializadas = atividades.map(atividade => {
      // Converter objeto para string e depois parsear para remover referências circulares
      return JSON.parse(JSON.stringify({
        CODATIVIDADE: String(atividade.CODATIVIDADE || ''),
        CODLEAD: String(atividade.CODLEAD || ''),
        TIPO: String(atividade.TIPO || ''),
        TITULO: String(atividade.TITULO || ''),
        DESCRICAO: String(atividade.DESCRICAO || ''),
        DATA_HORA: String(atividade.DATA_HORA || ''),
        DATA_INICIO: String(atividade.DATA_INICIO || ''),
        DATA_FIM: String(atividade.DATA_FIM || ''),
        CODUSUARIO: atividade.CODUSUARIO ? Number(atividade.CODUSUARIO) : 0,
        DADOS_COMPLEMENTARES: String(atividade.DADOS_COMPLEMENTARES || ''),
        NOME_USUARIO: String(atividade.NOME_USUARIO || ''),
        COR: String(atividade.COR || '#22C55E'),
        ORDEM: atividade.ORDEM ? Number(atividade.ORDEM) : 0,
        ATIVO: String(atividade.ATIVO || 'S'),
        STATUS: String(atividade.STATUS || 'AGUARDANDO')
      }));
    });

    console.log(`📤 Retornando ${atividadesSerializadas.length} eventos`);
    return new Response(JSON.stringify(atividadesSerializadas), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error: any) {
    console.error('❌ Erro ao consultar eventos:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao consultar eventos' },
      { status: 500 }
    );
  }
}

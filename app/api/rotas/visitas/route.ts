import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { oracleService } from '@/lib/oracle-db'
import { accessControlService } from '@/lib/access-control-service'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userCookie = cookieStore.get('user')
    
    if (!userCookie) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const user = JSON.parse(userCookie.value)
    const idEmpresa = user.ID_EMPRESA || user.idEmpresa
    const userId = user.CODUSUARIO || user.id

    const userAccess = await accessControlService.validateUserAccess(userId, idEmpresa)
    const visitasFilter = accessControlService.getVisitasWhereClause(userAccess)

    const { searchParams } = new URL(request.url)
    const codRota = searchParams.get('codRota')
    const codParc = searchParams.get('codParc')
    const dataInicio = searchParams.get('dataInicio')
    const dataFim = searchParams.get('dataFim')
    const status = searchParams.get('status')

    let conditions = [`v.ID_EMPRESA = :idEmpresa`]
    let binds: Record<string, any> = { idEmpresa, ...visitasFilter.binds }

    if (codRota) {
      conditions.push(`v.CODROTA = :codRota`)
      binds.codRota = parseInt(codRota)
    }
    if (codParc) {
      conditions.push(`v.CODPARC = :codParc`)
      binds.codParc = parseInt(codParc)
    }
    if (status) {
      conditions.push(`v.STATUS = :status`)
      binds.status = status
    }
    if (dataInicio) {
      conditions.push(`v.DATA_VISITA >= TO_DATE(:dataInicio, 'YYYY-MM-DD')`)
      binds.dataInicio = dataInicio
    }
    if (dataFim) {
      conditions.push(`v.DATA_VISITA <= TO_DATE(:dataFim, 'YYYY-MM-DD')`)
      binds.dataFim = dataFim
    }

    const sql = `
      SELECT 
        v.CODVISITA, v.ID_EMPRESA, v.CODROTA, v.CODPARC, v.CODVEND,
        TO_CHAR(v.DATA_VISITA, 'YYYY-MM-DD') AS DATA_VISITA,
        TO_CHAR(v.HORA_CHECKIN, 'YYYY-MM-DD"T"HH24:MI:SS') AS HORA_CHECKIN,
        TO_CHAR(v.HORA_CHECKOUT, 'YYYY-MM-DD"T"HH24:MI:SS') AS HORA_CHECKOUT,
        v.LAT_CHECKIN, v.LNG_CHECKIN, v.LAT_CHECKOUT, v.LNG_CHECKOUT,
        v.STATUS, v.OBSERVACAO, v.PEDIDO_GERADO, v.NUNOTA, v.VLRTOTAL,
        TO_CHAR(v.DTCAD, 'YYYY-MM-DD') AS DTCAD,
        p.NOMEPARC, p.CGC_CPF, p.IDENTINSCESTAD, p.TIPPESSOA, p.RAZAOSOCIAL,
        vend.APELIDO AS NOMEVENDEDOR,
        r.DESCRICAO AS NOME_ROTA
      FROM AD_VISITAS v
      LEFT JOIN AS_PARCEIROS p ON v.CODPARC = p.CODPARC AND p.ID_SISTEMA = v.ID_EMPRESA AND p.SANKHYA_ATUAL = 'S'
      LEFT JOIN AS_VENDEDORES vend ON v.CODVEND = vend.CODVEND AND vend.ID_SISTEMA = v.ID_EMPRESA
      LEFT JOIN AD_ROTAS r ON v.CODROTA = r.CODROTA AND r.ID_EMPRESA = v.ID_EMPRESA
      WHERE ${conditions.join(' AND ')} ${visitasFilter.clause}
      ORDER BY v.DATA_VISITA DESC, v.HORA_CHECKIN DESC
    `

    const visitas = await oracleService.executeQuery<any>(sql, binds)

    for (const visita of visitas) {
      if (visita.HORA_CHECKIN && visita.HORA_CHECKOUT) {
        const checkin = new Date(visita.HORA_CHECKIN)
        const checkout = new Date(visita.HORA_CHECKOUT)
        visita.duracao = Math.round((checkout.getTime() - checkin.getTime()) / (1000 * 60))
      }
    }

    return NextResponse.json(visitas)
  } catch (error: any) {
    console.error('Erro ao buscar visitas:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar visitas' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userCookie = cookieStore.get('user')
    
    if (!userCookie) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const user = JSON.parse(userCookie.value)
    const idEmpresa = user.ID_EMPRESA || user.idEmpresa
    const userId = user.CODUSUARIO || user.id

    const userAccess = await accessControlService.validateUserAccess(userId, idEmpresa)
    
    if (!accessControlService.canCreateOrEdit(userAccess)) {
      return NextResponse.json({ error: accessControlService.getAccessDeniedMessage(userAccess) }, { status: 403 })
    }

    const body = await request.json()
    const { action, codVisita, codRota, codParc, latitude, longitude, observacao, pedidoGerado, nunota, vlrTotal, adicionarCalendario } = body

    console.log(`[VISITA-API] Action: ${action}, codVisita: ${codVisita}, codParc: ${codParc}, user: ${userId}`);

    const codVend = userAccess.codVendedor

    if (action === 'checkin') {
      // Validar se já existe uma visita em andamento para este vendedor
      const visitaEmAndamento = await oracleService.executeOne<any>(`
        SELECT v.CODVISITA, p.NOMEPARC 
        FROM AD_VISITAS v
        LEFT JOIN AS_PARCEIROS p ON v.CODPARC = p.CODPARC AND p.ID_SISTEMA = v.ID_EMPRESA AND p.SANKHYA_ATUAL = 'S'
        WHERE v.ID_EMPRESA = :idEmpresa 
        AND v.CODVEND = :codVend 
        AND v.STATUS IN ('CHECKIN', 'EM_ANDAMENTO')
        AND (v.CODVISITA != :codVisita OR :codVisita IS NULL)
      `, { idEmpresa, codVend, codVisita: codVisita || null })

      if (visitaEmAndamento) {
        console.warn(`[VISITA-API] Tentativa de check-in bloqueada. Já existe visita em andamento: ${visitaEmAndamento.CODVISITA}`);
        return NextResponse.json({ 
          error: `Já existe uma visita em andamento com o parceiro ${visitaEmAndamento.NOMEPARC || 'desconhecido'}. Finalize-a antes de iniciar uma nova.` 
        }, { status: 400 })
      }

      console.log(`[VISITA-API] Iniciando processamento de check-in para codVisita: ${codVisita || 'nova'}`);

      // Atualizar localização do parceiro na nova tabela AD_PARCEIROS_LOC
      if (latitude && longitude) {
        try {
          const upsertLocSql = `
            MERGE INTO AD_PARCEIROS_LOC loc
            USING (SELECT :codParc as CODPARC, :idEmpresa as ID_SISTEMA, :nomeParc as NOMEPARC, :lat as LATITUDE, :lng as LONGITUDE FROM DUAL) src
            ON (loc.CODPARC = src.CODPARC AND loc.ID_SISTEMA = src.ID_SISTEMA)
            WHEN MATCHED THEN
              UPDATE SET loc.LATITUDE = src.LATITUDE, loc.LONGITUDE = src.LONGITUDE, loc.DTALTER = SYSDATE, loc.NOMEPARC = src.NOMEPARC
            WHEN NOT MATCHED THEN
              INSERT (CODPARC, ID_SISTEMA, NOMEPARC, LATITUDE, LONGITUDE, DTCAD, DTALTER)
              VALUES (src.CODPARC, src.ID_SISTEMA, src.NOMEPARC, src.LATITUDE, src.LONGITUDE, SYSDATE, SYSDATE)
          `
          
          // Buscar nome do parceiro se não vier no body
          let nomeParcFinal = body.nomeParc
          if (!nomeParcFinal) {
            const p = await oracleService.executeOne<any>(`SELECT NOMEPARC FROM AS_PARCEIROS WHERE CODPARC = :codParc AND ID_SISTEMA = :idEmpresa AND SANKHYA_ATUAL = 'S'`, { codParc, idEmpresa })
            nomeParcFinal = p?.NOMEPARC || 'Parceiro ' + codParc
          }

          await oracleService.executeQuery(upsertLocSql, {
            codParc,
            idEmpresa,
            nomeParc: nomeParcFinal,
            lat: latitude,
            lng: longitude
          })
          console.log(`📍 Localização do parceiro ${codParc} atualizada no check-in`)
        } catch (locErr) {
          console.error('Erro ao atualizar localização do parceiro:', locErr)
          // Não trava o check-in se falhar a atualização da loc
        }
      }

      if (codVisita) {
        // Se já existe uma visita (agendada), apenas atualizamos o status e o horário de check-in
        const updateSql = `
          UPDATE AD_VISITAS
          SET HORA_CHECKIN = SYSTIMESTAMP,
              LAT_CHECKIN = :latitude,
              LNG_CHECKIN = :longitude,
              STATUS = 'CHECKIN',
              DTCAD = SYSDATE
          WHERE CODVISITA = :codVisita AND ID_EMPRESA = :idEmpresa
        `
        console.log(`[VISITA-API] Atualizando visita agendada ${codVisita}`);
        await oracleService.executeQuery(updateSql, {
          latitude: latitude || null,
          longitude: longitude || null,
          codVisita,
          idEmpresa
        })

      // Gerar ou atualizar tarefa no check-in se não existir agendamento
        try {
          const v = await oracleService.executeOne<any>(`SELECT CODPARC, CODROTA, STATUS FROM AD_VISITAS WHERE CODVISITA = :codVisita AND ID_EMPRESA = :idEmpresa`, { codVisita, idEmpresa })
          if (v) {
            // Buscar nome do parceiro para o título
            const p = await oracleService.executeOne<any>(`SELECT NOMEPARC FROM AS_PARCEIROS WHERE CODPARC = :codParc AND ID_SISTEMA = :idEmpresa AND SANKHYA_ATUAL = 'S'`, { codParc: v.CODPARC, idEmpresa })
            const nomeParc = p?.NOMEPARC || 'Parceiro'

            // Verificar se já existe tarefa vinculada
            const t = await oracleService.executeOne<any>(`SELECT CODATIVIDADE FROM AD_ADLEADSATIVIDADES WHERE CODVISITA = :codVisita AND ID_EMPRESA = :idEmpresa`, { codVisita, idEmpresa })
            if (!t) {
              const insertTarefaSql = `
                INSERT INTO AD_ADLEADSATIVIDADES (
                  ID_EMPRESA, TIPO, DESCRICAO, DATA_HORA, 
                  DATA_INICIO, CODUSUARIO, ATIVO, STATUS, DATA_CRIACAO, TITULO,
                  CODPARC, CODROTA, CODVISITA, COR
                ) VALUES (
                  :idEmpresa, 'VISITA', :descricao, SYSTIMESTAMP, SYSTIMESTAMP, :userId, 'S', 'EM_ANDAMENTO', SYSDATE, :titulo, :codParc, :codRota, :codVisita, '#10b981'
                )
              `;
              await oracleService.executeQuery(insertTarefaSql, {
                idEmpresa,
                descricao: 'Visita iniciada via check-in',
                userId,
                titulo: `Visita: ${nomeParc}`,
                codParc: v.CODPARC,
                codRota: v.CODROTA,
                codVisita
              });
            } else {
              // Se já existe, garante que está em andamento e atualiza o título
              await oracleService.executeQuery(`UPDATE AD_ADLEADSATIVIDADES SET STATUS = 'EM_ANDAMENTO', TITULO = :titulo WHERE CODVISITA = :codVisita AND ID_EMPRESA = :idEmpresa`, {
                titulo: `Visita: ${nomeParc}`,
                codVisita,
                idEmpresa
              });
            }
          }
        } catch (tarefaErr) {
          console.error('Erro ao gerenciar tarefa no check-in:', tarefaErr);
        }

        return NextResponse.json({ 
          success: true, 
          codVisita,
          message: 'Check-in realizado com sucesso (Visita atualizada)'
        })
      }

      // Se não existe codVisita, criamos uma nova (Check-in avulso ou da Rota)
      const insertSql = `
        INSERT INTO AD_VISITAS (
          ID_EMPRESA, CODROTA, CODPARC, CODVEND, DATA_VISITA,
          HORA_CHECKIN, LAT_CHECKIN, LNG_CHECKIN, STATUS, OBSERVACAO, PEDIDO_GERADO, DTCAD
        ) VALUES (
          :idEmpresa, :codRota, :codParc, :codVend, TRUNC(SYSDATE),
          SYSTIMESTAMP, :latitude, :longitude, 'CHECKIN', :observacao, 'N', SYSDATE
        )
      `

      console.log(`[VISITA-API] Criando nova visita para parceiro ${codParc}`);
      await oracleService.executeQuery(insertSql, {
        idEmpresa,
        codRota: codRota || null,
        codParc,
        codVend,
        latitude: latitude || null,
        longitude: longitude || null,
        observacao: observacao || null
      })

      const lastVisitaSql = `
        SELECT CODVISITA FROM AD_VISITAS 
        WHERE ID_EMPRESA = :idEmpresa AND CODVEND = :codVend 
        ORDER BY CODVISITA DESC FETCH FIRST 1 ROWS ONLY
      `
      const lastVisita = await oracleService.executeOne<any>(lastVisitaSql, { idEmpresa, codVend })
      const novaCodVisita = lastVisita?.CODVISITA;

      // Gerar tarefa para check-in avulso ou se solicitado explicitamente
      if (novaCodVisita && (adicionarCalendario || !codRota)) {
        try {
          const p = await oracleService.executeOne<any>(`SELECT NOMEPARC FROM AS_PARCEIROS WHERE CODPARC = :codParc AND ID_SISTEMA = :idEmpresa AND SANKHYA_ATUAL = 'S'`, { codParc, idEmpresa })
          const nomeParc = p?.NOMEPARC || 'Parceiro'

          const insertTarefaSql = `
            INSERT INTO AD_ADLEADSATIVIDADES (
              ID_EMPRESA, TIPO, DESCRICAO, DATA_HORA, 
              DATA_INICIO, CODUSUARIO, ATIVO, STATUS, DATA_CRIACAO, TITULO,
              CODPARC, CODROTA, CODVISITA, COR
            ) VALUES (
              :idEmpresa, 'VISITA', :descricao, SYSTIMESTAMP, SYSTIMESTAMP, :userId, 'S', 'EM_ANDAMENTO', SYSDATE, :titulo, :codParc, :codRota, :codVisita, '#10b981'
            )
          `;
          const descricaoTarefa = adicionarCalendario 
            ? 'Visita agendada via modal de check-in' 
            : 'Visita realizada via check-in avulso';
          const tituloTarefa = `Visita: ${nomeParc}`;

          await oracleService.executeQuery(insertTarefaSql, {
            idEmpresa,
            descricao: descricaoTarefa,
            userId,
            titulo: tituloTarefa,
            codParc,
            codRota: codRota || null,
            codVisita: novaCodVisita
          });
        } catch (tarefaErr) {
          console.error('Erro ao gerar tarefa no check-in:', tarefaErr);
        }
      }

      return NextResponse.json({ 
        success: true, 
        codVisita: novaCodVisita,
        message: 'Check-in realizado com sucesso'
      })
    }

      if (action === 'checkout') {
        if (!codVisita) {
          return NextResponse.json({ error: 'codVisita é obrigatório para checkout' }, { status: 400 })
        }

        // Atualizar localização do parceiro na nova tabela AD_PARCEIROS_LOC no checkout também
        if (latitude && longitude) {
          try {
            // Buscar CODPARC da visita para garantir
            const v = await oracleService.executeOne<any>(`SELECT CODPARC FROM AD_VISITAS WHERE CODVISITA = :codVisita AND ID_EMPRESA = :idEmpresa`, { codVisita, idEmpresa })
            if (v?.CODPARC) {
              const upsertLocSql = `
                MERGE INTO AD_PARCEIROS_LOC loc
                USING (SELECT :codParc as CODPARC, :idEmpresa as ID_SISTEMA, :lat as LATITUDE, :lng as LONGITUDE FROM DUAL) src
                ON (loc.CODPARC = src.CODPARC AND loc.ID_SISTEMA = src.ID_SISTEMA)
                WHEN MATCHED THEN
                  UPDATE SET loc.LATITUDE = src.LATITUDE, loc.LONGITUDE = src.LONGITUDE, loc.DTALTER = SYSDATE
                WHEN NOT MATCHED THEN
                  INSERT (CODPARC, ID_SISTEMA, LATITUDE, LONGITUDE, DTCAD, DTALTER)
                  VALUES (src.CODPARC, src.ID_SISTEMA, src.LATITUDE, src.LONGITUDE, SYSDATE, SYSDATE)
              `
              await oracleService.executeQuery(upsertLocSql, {
                codParc: v.CODPARC,
                idEmpresa,
                lat: latitude,
                lng: longitude
              })
              console.log(`📍 Localização do parceiro ${v.CODPARC} atualizada no checkout`)
            }
          } catch (locErr) {
            console.error('Erro ao atualizar localização do parceiro no checkout:', locErr)
          }
        }

        const updateSql = `
          UPDATE AD_VISITAS
          SET HORA_CHECKOUT = SYSTIMESTAMP,
              LAT_CHECKOUT = :latitude,
              LNG_CHECKOUT = :longitude,
              STATUS = 'CONCLUIDA',
              OBSERVACAO = :observacao,
              PEDIDO_GERADO = :pedidoGerado,
              NUNOTA = :nunota,
              VLRTOTAL = :vlrTotal
          WHERE CODVISITA = :codVisita AND ID_EMPRESA = :idEmpresa
        `

        await oracleService.executeQuery(updateSql, {
          latitude: latitude || null,
          longitude: longitude || null,
          observacao: observacao || null,
          pedidoGerado: pedidoGerado ? 'S' : 'N',
          nunota: nunota || null,
          vlrTotal: vlrTotal || null,
          codVisita,
          idEmpresa
        })

        // Finalizar tarefa relacionada no calendário
        try {
          console.log(`🏁 Finalizando tarefa vinculada à visita ${codVisita}`);
          const updateTarefaSql = `
            UPDATE AD_ADLEADSATIVIDADES 
            SET STATUS = 'REALIZADO', 
                DATA_FIM = CURRENT_TIMESTAMP,
                DADOS_COMPLEMENTARES = :observacao
            WHERE CODVISITA = :codVisita 
            AND ID_EMPRESA = :idEmpresa 
          `
          await oracleService.executeQuery(updateTarefaSql, { 
            codVisita, 
            idEmpresa,
            observacao: (body.observacao || 'Visita finalizada via checkout').substring(0, 4000)
          })
          console.log(`✅ Tarefa da visita ${codVisita} finalizada`);
        } catch (tarefaErr) {
          console.error(`❌ Erro ao finalizar tarefa da visita ${codVisita}:`, tarefaErr)
        }

        return NextResponse.json({ 
          success: true, 
          message: 'Check-out realizado com sucesso'
        })
      }

    if (action === 'cancelar') {
      if (!codVisita) {
        return NextResponse.json({ error: 'codVisita é obrigatório' }, { status: 400 })
      }

      const updateSql = `
        UPDATE AD_VISITAS
        SET STATUS = 'CANCELADA', OBSERVACAO = :observacao
        WHERE CODVISITA = :codVisita AND ID_EMPRESA = :idEmpresa
      `

      await oracleService.executeQuery(updateSql, {
        observacao: observacao || 'Visita cancelada',
        codVisita,
        idEmpresa
      })

      // Cancelar tarefa relacionada no calendário
      try {
        const updateTarefaSql = `
          UPDATE AD_ADLEADSATIVIDADES 
          SET STATUS = 'CANCELADA'
          WHERE CODVISITA = :codVisita 
          AND ID_EMPRESA = :idEmpresa 
          AND STATUS = 'PENDENTE'
        `
        await oracleService.executeQuery(updateTarefaSql, { codVisita, idEmpresa })
      } catch (tarefaErr) {
        console.error('Erro ao cancelar tarefa vinculada:', tarefaErr)
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Visita cancelada'
      })
    }

    } catch (error: any) {
    console.error('[VISITA-API-ERROR] Erro na operação de visita:', error)
    // Log detalhado do erro para ajudar no diagnóstico
    if (error.code === 'NJS-510') {
      console.error('[VISITA-API-ERROR] Timeout de conexão com o Oracle detectado.');
    }
    return NextResponse.json(
      { error: error.message || 'Erro interno na operação de visita' },
      { status: 500 }
    )
  }
}

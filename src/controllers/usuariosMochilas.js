import { prisma } from '../prisma.js';
import { Prisma } from '@prisma/client';
import { verificarToken } from '../utils.js';

// Para testes, desativar depois
// Validado (31/08/2025)
/*
export async function listarUsuariosMochilas(req, res){
  try {
    const usuariosMochilas = await prisma.usuariosMochilas.findMany({
      orderBy: {
        DataFimUso: 'desc'
      }
    });
    return res.json(usuariosMochilas);
  }catch(e){
    return res.status(500).json({ error: 'Erro ao listar usuários e suas mochilas' })
  }
}
*/

// Validado (14/09/25) - Obter mochilas do usuário (ativas)
export async function obterMochilaUsuario(req, res) {
  try {

    let usuario = null;
    if (! await verificarToken(req)) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    } else {
      usuario = await verificarToken(req);
    }

    const UsuarioId = Number(usuario.UsuarioId);

    if (!usuario.tipo) {
      return res.status(403).json({ error: "Token iválido para usuário" });
    }

    if (usuario.tipo !== 'usuario') {
      return res.status(403).json({ error: "Token iválido para usuário" });
    }

    if (!UsuarioId || isNaN(UsuarioId)) {
      return res.status(400).json({ error: "ID do usuário inválido" });
    }

    const mochilasUsuario = await prisma.usuariosMochilas.findMany({
      where: {
        UsuarioId: UsuarioId
      },
      orderBy: {
        DataFimUso: 'desc'
      }
    });

    let mochilas = [];
    for (let i = 0; i < mochilasUsuario.length; i++) {
      const m = await prisma.mochilas.findFirst({
        where: {
          MochilaId: mochilasUsuario[i].MochilaId,
          MochilaStatus: "Ativo"
        },
        select: {
          MochilaCodigo: true,
          MochilaDescricao: true,
          MochilaPesoMax: true
        }
      });

      if (m) {
        let mochila = {
          MochilaCodigo: m.MochilaCodigo,
          MochilaDescricao: m.MochilaDescricao,
          MochilaPesoMax: m.MochilaPesoMax,
          MochilaNome: mochilasUsuario[i].MochilaNome,
          UsoStatus: mochilasUsuario[i].UsoStatus,
          DataFimUso: mochilasUsuario[i].DataFimUso,
          DataInicioUso: mochilasUsuario[i].DataInicioUso
        }

        if (mochila) {
          mochilas.push(mochila);
        }
      }

    }

    return res.status(200).json({ mochilas: mochilas, ok: true });

  } catch (e) {
    return res.status(500).json({ error: "Erro ao obter mochilas" });
  } finally {
    await prisma.$disconnect();
  }
}

export async function obterMochilaUsuarioUso(req, res) {
  try {

    let usuario = null;
    if (! await verificarToken(req)) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    } else {
      usuario = await verificarToken(req);
    }

    const UsuarioId = Number(usuario.UsuarioId);

    if (!usuario.tipo) {
      return res.status(403).json({ error: "Token iválido para usuário" });
    }

    if (usuario.tipo !== 'usuario') {
      return res.status(403).json({ error: "Token iválido para usuário" });
    }

    if (!UsuarioId || isNaN(UsuarioId)) {
      return res.status(400).json({ error: "ID do usuário inválido" });
    }

    const mochilaUsuario = await prisma.usuariosMochilas.findFirst({
      where: {
        UsuarioId: UsuarioId,
        OR: [
          { UsoStatus: 'Usando' },
          { UsoStatus: 'Último a Usar' }
        ]
      },
      orderBy: {
        DataFimUso: 'desc'
      }
    });

    if (!mochilaUsuario) {
      return res.status(404).json({ error: 'Nenhuma mochila encontrada para o usuário', mochila: 'Nenhuma' });
    } else {

      const m = await prisma.mochilas.findFirst({
        where: {
          MochilaId: mochilaUsuario.MochilaId,
          MochilaStatus: "Ativo"
        },
        select: {
          MochilaCodigo: true,
          MochilaDescricao: true,
          MochilaPesoMax: true
        }
      });

      if (!m) {
        return res.status(404).json({ error: 'Nenhuma mochila encontrada para o usuário', mochila: 'Nenhuma' });
      }

      let mochila = {
        MochilaCodigo: m.MochilaCodigo,
        MochilaDescricao: m.MochilaDescricao,
        MochilaPesoMax: m.MochilaPesoMax,
        MochilaNome: mochilaUsuario.MochilaNome,
        UsoStatus: mochilaUsuario.UsoStatus,
        DataFimUso: mochilaUsuario.DataFimUso,
        DataInicioUso: mochilaUsuario.DataInicioUso
      }

      return res.status(200).json({ mochila: mochila, ok: true });
    }

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao obter mochilas" });
  } finally {
    await prisma.$disconnect();
  }
}

// Validado (14/09/25) - Vincular mochila ao usuário
export async function vincularMochila(req, res) {
  try {
    const { MochilaCodigo, MochilaNome } = req.body;

    let dadosUsuario = null;
    if (! await verificarToken(req)) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    } else {
      dadosUsuario = await verificarToken(req);
    }

    const UsuarioId = Number(dadosUsuario.UsuarioId);

    if (!dadosUsuario.tipo) {
      return res.status(403).json({ error: "Token iválido para usuário" });
    }

    if (dadosUsuario.tipo !== 'usuario') {
      return res.status(403).json({ error: "Token iválido para usuário" });
    }

    if (!MochilaCodigo || MochilaCodigo.trim() === '') {
      return res.status(400).json({ error: 'Código da mochila é obrigatório' });
    }

    if (!UsuarioId || isNaN(UsuarioId)) {
      return res.status(400).json({ error: "ID do usuário inválido" });
    }

    const mochila = await prisma.mochilas.findUnique({ where: { MochilaCodigo: MochilaCodigo, MochilaStatus: 'Ativo' } });
    if (!mochila) {
      return res.status(404).json({ error: 'Mochila não encontrada' });
    }

    const usuario = await prisma.usuarios.findUnique({ where: { UsuarioId: UsuarioId } });
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verifica se já existe um vínculo ativo
    const usuarioMochilaExistente = await prisma.usuariosMochilas.findFirst({
      where: { UsuarioId: UsuarioId, MochilaId: mochila.MochilaId }
    });

    if (usuarioMochilaExistente) {
      return res.status(409).json({ error: 'Usuário já está vinculado a esta mochila' });
    }

    // Cria o vínculo
    await prisma.usuariosMochilas.create({
      data: {
        UsuarioId: UsuarioId,
        MochilaId: mochila.MochilaId,
        MochilaNome: MochilaNome, // Apelido que o usuário deu para a mochila
        UsoStatus: 'Não Usando', // Inicialmente não está em uso
        DataFimUso: null, // Data de fim de uso inicialmente nula
        DataInicioUso: null // Data de início de uso inicialmente nula
      }
    });

    return res.json({ ok: true, message: 'Mochila vinculada com sucesso' });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao vincular mochila' });
  } finally {
    await prisma.$disconnect();
  }
}

// Validar
export async function desvincularMochila(req, res) {
  try {
    const { MochilaCodigo } = req.body;

    // Verifica se o token é válido e identifica o usuário
    let dadosUsuario = null;
    if (!await verificarToken(req)) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    } else {
      dadosUsuario = await verificarToken(req);
    }

    const UsuarioId = Number(dadosUsuario.UsuarioId);

    if (!dadosUsuario.tipo) {
      return res.status(403).json({ error: "Token inválido para usuário" });
    }

    if (dadosUsuario.tipo !== 'usuario') {
      return res.status(403).json({ error: "Token inválido para usuário" });
    }

    if (!MochilaCodigo || MochilaCodigo.trim() === '') {
      return res.status(400).json({ error: 'Código da mochila é obrigatório' });
    }

    if (!UsuarioId || isNaN(UsuarioId)) {
      return res.status(400).json({ error: "ID do usuário inválido" });
    }

    // Busca a mochila ativa
    const mochila = await prisma.mochilas.findUnique({
      where: { MochilaCodigo: MochilaCodigo, MochilaStatus: 'Ativo' }
    });

    if (!mochila) {
      return res.status(404).json({ error: 'Mochila não encontrada' });
    }

    // Verifica se o vínculo existe
    const usuarioMochila = await prisma.usuariosMochilas.findFirst({
      where: {
        UsuarioId: UsuarioId,
        MochilaId: mochila.MochilaId
      }
    });

    if (!usuarioMochila) {
      return res.status(404).json({ error: 'Usuário não possui vínculo com esta mochila' });
    }

    // Remove o vínculo
    await prisma.usuariosMochilas.delete({
      where: {
        UsuarioId_MochilaId: {
          UsuarioId,
          MochilaId: mochila.MochilaId
        }
      }
    });

    return res.json({ ok: true, message: 'Vínculo com a mochila removido com sucesso' });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao desvincular mochila' });
  } finally {
    await prisma.$disconnect();
  }
}

// Validado (14/09/25) - Assumir Uso da Mochila
export async function assumirUsoMochila(req, res) {
  try {
    const { MochilaCodigo } = req.body;

    let dadosUsuario = null;
    if (! await verificarToken(req)) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    } else {
      dadosUsuario = await verificarToken(req);
    }

    const UsuarioId = Number(dadosUsuario.UsuarioId);

    if (!dadosUsuario.tipo) {
      return res.status(403).json({ error: "Token iválido para usuário" });
    }

    if (dadosUsuario.tipo !== 'usuario') {
      return res.status(403).json({ error: "Token iválido para usuário" });
    }

    if (!UsuarioId || isNaN(UsuarioId)) {
      return res.status(400).json({ error: "ID do usuário inválido" });
    }

    if (!MochilaCodigo || MochilaCodigo.trim() === '') {
      return res.status(400).json({ error: 'Código da mochila é obrigatório' });
    }

    const mochila = await prisma.mochilas.findUnique({ where: { MochilaCodigo: MochilaCodigo } });

    if (!mochila) {
      return res.status(404).json({ error: 'Mochila não encontrada' });
    }

    const usuario = await prisma.usuarios.findUnique({ where: { UsuarioId: UsuarioId } });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const usuarioMochila = await prisma.usuariosMochilas.findFirst({
      where: { MochilaId: mochila.MochilaId, UsuarioId: UsuarioId }
    });

    if (!usuarioMochila) {
      return res.status(404).json({ error: 'Vínculo entre usuário e mochila não encontrado' });
    }

    let usuarioMochilaUsando = await prisma.usuariosMochilas.findFirst({
      where: {
        MochilaId: mochila.MochilaId,
        UsoStatus: 'Usando'
      }
    });

    if (usuarioMochilaUsando) {
      if (usuarioMochilaUsando.UsuarioId === UsuarioId) {
        return res.json({ ok: true, message: 'Mochila já esta assumida pelo usuário' });
      } else {
        return res.status(409).json({ error: 'Já existe um usuário usando esta mochila' });
      }
    }

    usuarioMochilaUsando = await prisma.usuariosMochilas.findFirst({
      where: {
        UsuarioId: UsuarioId,
        NOT: { MochilaId: mochila.MochilaId },
        UsoStatus: 'Usando'
      }
    });

    if (!usuarioMochilaUsando) {
      usuarioMochilaUsando = await prisma.usuariosMochilas.findFirst({
        where: {
          UsuarioId: UsuarioId,
          NOT: { MochilaId: mochila.MochilaId },
          UsoStatus: 'Último a Usar'
        }
      });
    }

    const hojeAgora = new Date();

    // Atualização ATÔMICA: só assume se ninguém estiver ativo
    const rows = await prisma.$queryRaw`
      UPDATE "UsuariosMochilas"
      SET "DataInicioUso" = ${hojeAgora}, "DataFimUso" = NULL, "UsoStatus" = 'Usando'
      WHERE "UsuarioId" = ${UsuarioId} AND "MochilaId" = ${mochila.MochilaId}
        AND NOT EXISTS (
          SELECT 1 FROM "UsuariosMochilas"
          WHERE "MochilaId" = ${mochila.MochilaId} AND "UsoStatus" = 'Usando'
          AND NOT ("UsuarioId" = ${UsuarioId})
        )
      RETURNING "UsuarioId","MochilaId","DataInicioUso";
    `;

    if (rows.length === 0) {
      return res.status(409).json({ error: 'Mochila já está em uso por outro usuário' });
    } else {
      await prisma.usuariosMochilas.updateMany({
        where: {
          MochilaId: mochila.MochilaId,
          UsoStatus: 'Último a Usar'
        },
        data: {
          UsoStatus: 'Não Usando'
        }
      });
    }

    if (usuarioMochilaUsando) {
      await prisma.usuariosMochilas.update({
        where: {
          UsuarioId_MochilaId: {
            UsuarioId: usuarioMochilaUsando.UsuarioId,
            MochilaId: usuarioMochilaUsando.MochilaId
          }
        },
        data: { DataFimUso: hojeAgora, UsoStatus: 'Não Usando' }
      });
      return res.json(usuarioMochilaUsando);
    }

    return res.json({ ok: true, message: 'Mochila assumida com sucesso' });

  } catch (e) {
    // Se o índice único parcial acusar violação
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return res.status(409).json({ error: 'Mochila já está em uso' });
    }
    console.error(e);
    return res.status(500).json({ error: 'Erro ao assumir uso' });
  } finally {
    await prisma.$disconnect();
  }
}

export async function editarNomeMochila(req, res) {
  try {
    const { MochilaCodigo, NovoNome } = req.body;

    if (!await verificarToken(req)) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const dadosUsuario = await verificarToken(req);
    const UsuarioId = Number(dadosUsuario.UsuarioId);

    if (dadosUsuario.tipo !== 'usuario') {
      return res.status(403).json({ error: "Token inválido para usuário" });
    }

    if (!MochilaCodigo || !NovoNome || NovoNome.trim() === '') {
      return res.status(400).json({ error: 'Código da mochila e novo nome são obrigatórios' });
    }

    // Verifica se a mochila existe e está ativa
    const mochila = await prisma.mochilas.findUnique({
      where: { MochilaCodigo, MochilaStatus: 'Ativo' }
    });

    if (!mochila) {
      return res.status(404).json({ error: 'Mochila não encontrada' });
    }

    // Verifica se o vínculo existe
    const usuarioMochila = await prisma.usuariosMochilas.findFirst({
      where: { UsuarioId, MochilaId: mochila.MochilaId }
    });

    if (!usuarioMochila) {
      return res.status(404).json({ error: 'Usuário não possui vínculo com esta mochila' });
    }

    // Atualiza o nome utilizando a chave composta
    await prisma.usuariosMochilas.update({
      where: {
        UsuarioId_MochilaId: {
          UsuarioId,
          MochilaId: mochila.MochilaId
        }
      },
      data: { MochilaNome: NovoNome.trim() }
    });

    return res.json({ ok: true, message: 'Nome da mochila atualizado com sucesso' });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao editar nome da mochila' });
  } finally {
    await prisma.$disconnect();
  }
}


// Validado (15/09/25) - Encerrar uso da mochila pelo usuário
export async function encerrarUsoApp(req, res) {
  try {
    const { MochilaCodigo } = req.body;

    let dadosUsuario = null;
    if (! await verificarToken(req)) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    } else {
      dadosUsuario = await verificarToken(req);
    }

    const UsuarioId = Number(dadosUsuario.UsuarioId);

    if (!dadosUsuario.tipo) {
      return res.status(403).json({ error: "Token iválido para usuário" });
    }

    if (dadosUsuario.tipo !== 'usuario') {
      return res.status(403).json({ error: "Token iválido para usuário" });
    }

    if (!UsuarioId || isNaN(UsuarioId)) {
      return res.status(400).json({ error: "ID do usuário inválido" });
    }

    if (!MochilaCodigo || MochilaCodigo.trim() === '') {
      return res.status(400).json({ error: 'Código da mochila é obrigatório' });
    }

    const mochila = await prisma.mochilas.findUnique({ where: { MochilaCodigo: MochilaCodigo } });
    if (!mochila) {
      return res.status(404).json({ error: 'Mochila não encontrada' });
    }

    const usuario = await prisma.usuarios.findUnique({ where: { UsuarioId: UsuarioId } });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const encerrado = await prisma.usuariosMochilas.updateMany({
      where: { UsuarioId: UsuarioId, MochilaId: mochila.MochilaId, OR: [{ UsoStatus: 'Usando' }, { UsoStatus: 'Último a Usar' }] },
      data: { DataFimUso: new Date(), UsoStatus: 'Não Usando' }
    });

    if (encerrado.count === 0) {
      return res.status(409).json({ error: 'Nenhum uso ativo encontrado para encerrar' });
    }

    return res.json({ ok: true, message: 'Uso encerrado com sucesso' });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao encerrar uso' });
  } finally {
    await prisma.$disconnect();
  }
}

// Validado (15/09/25) - Encerrar uso da mochila pela IoT
export async function encerrarUsoIOT(req, res) {
  try {
    let dadosMochila = null;
    if (! await verificarToken(req)) {
      return res.status(401).json({ error: 'Mochila não autenticada' });
    } else {
      dadosMochila = await verificarToken(req);
    }

    if (dadosMochila.tipo !== 'iot') {
      return res.status(403).json({ error: 'Acesso negado. Token inválido para mochila.' + ' Tipo: ' + dadosMochila.tipo });
    }

    let MochilaId = Number(dadosMochila.MochilaId);

    if (!MochilaId || isNaN(MochilaId) || MochilaId <= 0) {
      return res.status(400).json({ error: 'ID da mochila inválido' });
    }

    const mochila = await prisma.mochilas.findUnique({ where: { MochilaId: MochilaId } });
    if (!mochila) {
      return res.status(404).json({ error: 'Mochila não encontrada' });
    }

    const encerrado = await prisma.usuariosMochilas.updateMany({
      where: { MochilaId: mochila.MochilaId, UsoStatus: 'Usando', DataFimUso: null },
      data: { DataFimUso: new Date(), UsoStatus: 'Último a Usar' }
    });

    if (encerrado.count === 0) {
      return res.status(409).json({ error: 'Nenhum uso ativo encontrado para encerrar' });
    }

    return res.json({ ok: true, message: 'Uso encerrado com sucesso' });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao encerrar uso' });
  } finally {
    await prisma.$disconnect();
  }
}
import { prisma } from '../prisma.js';
import { Prisma } from '@prisma/client';
import { validarSessao, verificarSenha } from '../utils.js';
import { tr } from 'zod/locales';

// Para testes, desativar depois
// Validado (31/08/2025)
export async function listarUsuariosMochilas(req, res){
  try {
    const usuariosMochilas = await prisma.usuarios_Mochilas.findMany({
      orderBy: {
        DataFimUso: 'desc'
      }
    });
    return res.json(usuariosMochilas);
  }catch(e){
    return res.status(500).json({ error: 'Erro ao listar usuários e suas mochilas' })
  }
}

// Validado (31/08/2025)
export async function obterMochilaUsuario(req, res) {
    try {

        if (!validarSessao(req)){
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }
    
        const UsuarioId = req.session.usuario.id;

        const mochilasUsuario = await prisma.usuarios_Mochilas.findMany({
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

            if (m){
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

        return res.status(200).json({ mochilas });

    }catch(e){
        return res.status(500).json({ error: "Erro ao obter mochilas" });
    }
}

// Validado (31/08/2025)
export async function vincularMochila(req, res) {
  try {
    const { MochilaCodigo, MochilaNome } = req.body;

    if (!validarSessao(req)){
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const UsuarioId = req.session.usuario.id;

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

    // Verifica se já existe um vínculo ativo
    const usuarioMochilaExistente = await prisma.usuarios_Mochilas.findFirst({
      where: { UsuarioId: UsuarioId, MochilaId: mochila.MochilaId }
    });

    if (usuarioMochilaExistente) {
      return res.status(409).json({ error: 'Usuário já está vinculado a esta mochila' });
    }

    // Cria o vínculo
    await prisma.usuarios_Mochilas.create({
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
  }
}

// Validado (31/08/2025)
export async function assumirUsoMochila(req, res) {
  try {
    const { MochilaCodigo } = req.body;

    if (!validarSessao(req)){
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const UsuarioId = req.session.usuario.id;

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

    const usuarioMochila = await prisma.usuarios_Mochilas.findFirst({
      where: { MochilaId: mochila.MochilaId, UsuarioId: UsuarioId }
    });

    if (!usuarioMochila) {
      return res.status(404).json({ error: 'Vínculo entre usuário e mochila não encontrado' });
    }

    let usuarioMochilaUsando = await prisma.usuarios_Mochilas.findFirst({
      where: { 
        MochilaId: mochila.MochilaId, 
        UsoStatus: 'Usando' 
      }
    });

    if (usuarioMochilaUsando) {
      if (usuarioMochilaUsando.UsuarioId === UsuarioId) {
        return res.json({ ok: true, message:'Mochila já esta assumida pelo usuário' });
      }else{
        return res.status(409).json({ error: 'Já existe um usuário usando esta mochila' });
      }
    }

    usuarioMochilaUsando = await prisma.usuarios_Mochilas.findFirst({
      where: { 
        UsuarioId: UsuarioId, 
        NOT: { MochilaId: mochila.MochilaId },
        UsoStatus: 'Usando' 
      }
    });

    if (!usuarioMochilaUsando){
      usuarioMochilaUsando = await prisma.usuarios_Mochilas.findFirst({
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
      UPDATE "Usuarios_Mochilas"
      SET "DataInicioUso" = ${hojeAgora}, "DataFimUso" = NULL, "UsoStatus" = 'Usando'
      WHERE "UsuarioId" = ${UsuarioId} AND "MochilaId" = ${mochila.MochilaId}
        AND NOT EXISTS (
          SELECT 1 FROM "Usuarios_Mochilas"
          WHERE "MochilaId" = ${mochila.MochilaId} AND "DataFimUso" IS NULL
          AND NOT ("UsuarioId" = ${UsuarioId})
        )
      RETURNING "UsuarioId","MochilaId","DataInicioUso";
    `;

    if (rows.length === 0) {
      return res.status(409).json({ error: 'Mochila já está em uso por outro usuário' });
    }else{
      await prisma.usuarios_Mochilas.updateMany({
        where: { 
          MochilaId: mochila.MochilaId, 
          UsoStatus: 'Último a Usar' 
        },
        data: { 
          UsoStatus: 'Não Usando' 
        }
      });
    }

    if (usuarioMochilaUsando){
      await prisma.usuarios_Mochilas.update({
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

    return res.json({ ok: true, message:'Mochila assumida com sucesso' });

  } catch (e) {
    // Se o índice único parcial acusar violação
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return res.status(409).json({ error: 'Mochila já está em uso' });
    }
    console.error(e);
    return res.status(500).json({ error: 'Erro ao assumir uso' });
  }
}

// Validado (31/08/2025)
export async function encerrarUsoApp(req, res) {
  try {
    const { MochilaCodigo } = req.body;
    
    if (!validarSessao(req)){
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const UsuarioId = req.session.usuario.id;

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

    const encerrado = await prisma.usuarios_Mochilas.updateMany({
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
  }
}

// Validado (31/08/2025)
export async function encerrarUsoIOT(req, res) {
  try {
    const { MochilaCodigo, MochilaSenha } = req.body;

    if (!MochilaCodigo || MochilaCodigo.trim() === '') {
      return res.status(400).json({ error: 'Código da mochila é obrigatório' });
    }

    if (!MochilaSenha || MochilaSenha.trim() === '') {
      return res.status(400).json({ error: 'Senha da mochila é obrigatório' });
    }

    const mochila = await prisma.mochilas.findUnique({ where: { MochilaCodigo: MochilaCodigo } });
    if (!mochila) {
      return res.status(404).json({ error: 'Mochila não encontrada' });
    }

    if (! await verificarSenha(MochilaSenha, mochila.MochilaSenha)){
      return res.status(401).json({ error: 'Senha da mochila incorreta' });
    }

    const encerrado = await prisma.usuarios_Mochilas.updateMany({
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
  }
}
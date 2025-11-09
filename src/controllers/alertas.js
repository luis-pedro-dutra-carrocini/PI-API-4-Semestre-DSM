import { PrismaClient } from "@prisma/client";
import { verificarToken } from '../utils.js';

const prisma = new PrismaClient();

// Listar todos os alertas (teste, desativar depois)
/*
export async function listarAlertas(req, res) {
  try {
    const alertas = await prisma.alertas.findMany({
      orderBy: { AlertaData: "desc" }
    });

    return res.json(alertas);
  } catch (error) {
    console.error("Erro ao listar alertas:", error);
    return res.status(500).json({ error: "Erro ao listar alertas" });
  }
}
*/

// Validado (31/08/2025)
// Criar alerta (desativado, será criado automáticamente de acordo com o exesso registrado na medição)
/*
export async function criarAlerta(req, res) {
  try {
    const { MedicaoId, AlertaTitulo, AlertaDescricao, AlertaNivel, AlertaStatus } = req.body;

    if (!MedicaoId || isNaN(Number(MedicaoId))) {
      return res.status(400).json({ error: "ID da medição é obrigatório" });
    }

    if (!AlertaTitulo || AlertaTitulo.trim() === "") {
      return res.status(400).json({ error: "O título do alerta é obrigatório" });
    }

    if (!AlertaDescricao || AlertaDescricao.trim() === "") {
      return res.status(400).json({ error: "A descrição do alerta é obrigatória" });
    }

    if (!AlertaNivel || !["Baixo", "Médio", "Alto"].includes(AlertaNivel)) {
      return res.status(400).json({ error: "Nível de alerta inválido. Deve ser 'Baixo', 'Médio', 'Alto' ou 'Crítico'" });
    }

    if (!AlertaStatus || !["Enviar", "Enviado", "Lido", null].includes(AlertaStatus)) {
      return res.status(400).json({ error: "Status de alerta inválido. Deve ser 'Enviar', 'Enviado' ou 'Lido'" });
    }

    const novoAlerta = await prisma.alertas.create({
      data: {
        MedicaoId: MedicaoId,
        AlertaTitulo: AlertaTitulo,
        AlertaDescricao: AlertaDescricao,
        AlertaNivel: AlertaNivel,
        AlertaStatus: AlertaStatus || "Enviar"
      }
    });

    //return res.status(201).json({ ok: true,message: "Alerta criado com sucesso" });
    return res.status(201).json(novoAlerta);

  } catch (error) {
    console.error("Erro ao criar alerta:", error);
    return res.status(500).json({ error: "Erro ao criar alerta" });
  }
}
*/

// Validado (31/08/2025)
// Listar todos os alertas por medição
/*
export async function listarAlertasMedicao(req, res) {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: "ID da medição inválido" });
    }

    const medicao = await prisma.medicoes.findUnique({
      where: { MedicaoId: Number(id) }
    });

    if (!medicao) {
      return res.status(404).json({ error: "Medição não encontrada" });
    }

    const alertas = await prisma.alertas.findMany({
        where: { MedicaoId: Number(id) },
        orderBy: { AlertaData: "desc" }
    });

    return res.json(alertas);

  } catch (error) {
    console.error("Erro ao listar alertas: ", error);
    return res.status(500).json({ error: "Erro ao listar alertas" });
  }
}
*/

// Validado (20/09/2025)
// Obter alerta por ID
export async function obterAlerta(req, res) {
  try {

    let usuario = await verificarToken(req);

    if (!usuario) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { id } = req.params;

    const UsuarioId = Number(usuario.UsuarioId);

    if (usuario.tipo !== 'usuario'){
      return res.status(403).json({ error: "Token iválido para usuário" });
    }

    if (!UsuarioId || isNaN(UsuarioId)){
      return res.status(400).json({ error: "ID do usuário inválido" });
    }

    const dadosUsuario = await prisma.usuarios.findUnique({ where: { UsuarioId: UsuarioId } });

    if (!dadosUsuario) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: "ID do alerta inválido" });
    }

    const alerta = await prisma.alertas.findUnique({
      where: { AlertaId: Number(id), UsuarioId: UsuarioId }
    });

    if (!alerta) {
      return res.status(404).json({ error: "Alerta não encontrado" });
    }

    return res.json(alerta);

  } catch (error) {
    console.error("Erro ao obter alerta:", error);
    return res.status(500).json({ error: "Erro ao obter alerta" });
  }
}

// Validar
// Atualizar alerta (alterar status somente)
export async function atualizarAlerta(req, res) {
  try {

    let usuario = await verificarToken(req);

    if (!usuario) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const UsuarioId = Number(usuario.UsuarioId);

    if(!usuario.tipo){
      return res.status(403).json({ error: "Token iválido para usuário" });
    }

    if (usuario.tipo !== 'usuario'){
      return res.status(403).json({ error: "Token iválido para usuário" });
    }

    if (!UsuarioId || isNaN(UsuarioId)){
      return res.status(400).json({ error: "ID do usuário inválido" });
    }

    const dadosUsuario = await prisma.usuarios.findUnique({ where: { UsuarioId: UsuarioId } });

    if (!dadosUsuario) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: "ID do alerta inválido" });
    }

    const { AlertaStatus } = req.body;

    if (!AlertaStatus || !["Enviar", "Enviado", "Lido"].includes(AlertaStatus)) {
      return res.status(400).json({ error: "Status de alerta inválido. Deve ser 'Enviar', 'Enviado' ou 'Lido'" });
    }

    const alertaAtualizado = await prisma.alertas.update({
      where: { AlertaId: Number(id), UsuarioId: UsuarioId },
      data: {
        AlertaStatus
      }
    });

    if (!alertaAtualizado) {
      return res.status(404).json({ error: "Alerta não encontrado" });
    }

    return res.status(200).json({ ok: true, message: "Alerta atualizado com sucesso" });
    //return res.json(alertaAtualizado);

  } catch (error) {
    console.error("Erro ao atualizar alerta:", error);
    return res.status(500).json({ error: "Erro ao atualizar alerta" });
  }
}

// Validado (20/09/2025)
// Listar todos os alertas de um usuário pelo status informado
export async function listarAlertasUsuario(req, res) {
  try {
    
    let dadosUsuario = await verificarToken(req);

    if (!dadosUsuario) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const UsuarioId = Number(dadosUsuario.UsuarioId);

    if(!dadosUsuario.tipo){
      return res.status(403).json({ error: "Token iválido para usuário" });
    }

    if (dadosUsuario.tipo !== 'usuario'){
      return res.status(403).json({ error: "Token iválido para usuário" });
    }

    const usuario = await prisma.usuarios.findUnique({
      where: { UsuarioId: UsuarioId }
    });

    if (!usuario) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const AlertaStatus = req.params.status;;

    if (!AlertaStatus || !["Enviar", "Enviado", "Lido"].includes(AlertaStatus)) {
      return res.status(400).json({ error: "Status de alerta inválido. Deve ser 'Enviar', 'Enviado' ou 'Lido'" });
    }

    const alertas = await prisma.alertas.findMany({
        where: { UsuarioId: Number(UsuarioId), AlertaStatus: AlertaStatus },
        orderBy: { AlertaData: 'asc' }
    });

    return res.json(alertas);

  } catch (error) {
    console.error("Erro ao listar alertas: ", error);
    return res.status(500).json({ error: "Erro ao listar alertas" });
  }
}

// Validado (20/09/2025)
// Deletar alerta
export async function deletarAlerta(req, res) {
  try {

    let usuario = await verificarToken(req);

    if (!usuario) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const AlertaId = Number(req.params.id);

    const UsuarioId = Number(usuario.UsuarioId);

    if(!usuario.tipo){
      return res.status(403).json({ error: "Token iválido para usuário" });
    }

    if (usuario.tipo !== 'usuario'){
      return res.status(403).json({ error: "Token iválido para usuário" });
    }

    if (!UsuarioId || isNaN(UsuarioId)){
      return res.status(400).json({ error: "ID do usuário inválido" });
    }

    const dadosUsuario = await prisma.usuarios.findUnique({ where: { UsuarioId: UsuarioId } });

    if (!dadosUsuario) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    if (!AlertaId || isNaN(Number(AlertaId))) {
      return res.status(400).json({ error: "ID do alerta inválido" });
    }

    const alerta = await prisma.alertas.findUnique({
      where: { AlertaId: Number(AlertaId), UsuarioId: Number(UsuarioId) }
    });

    if (!alerta) {
      return res.status(404).json({ error: "Alerta não encontrado" });
    }

    await prisma.alertas.delete({
      where: { AlertaId: Number(AlertaId) }
    });

    return res.json({ ok: true, message: "Alerta deletado com sucesso" });

  } catch (error) {
    console.error("Erro ao deletar alerta:", error);
    return res.status(500).json({ error: "Erro ao deletar alerta" });
  }
}

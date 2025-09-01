import { is } from 'zod/locales';
import { prisma } from '../prisma.js';
import { roundTo2, validarSessao, verificarSenha } from '../utils.js';


// Validado (31/08/2025)
export async function criarMedicao(req, res) {
  try {
    const { MochilaCodigo, MochilaSenha, MedicaoPeso, MedicaoLocal } = req.body;
    let MedicaoStatus, MedicaoPesoMais;

    if (!MochilaCodigo || MochilaCodigo.trim() === '') {
      return res.status(400).json({ error: 'Codigo da mochila é obrigatório' });
    }

    if (!MochilaSenha || MochilaSenha.trim() === '') {
      return res.status(400).json({ error: 'Senha da mochila é obrigatório' });
    }

    let pesoNormalizado;
    if (!MedicaoPeso || isNaN(MedicaoPeso)) {
      return res.status(400).json({ error: 'Peso é obrigatório' });
    } else if (MedicaoPeso <= 0) {
      return res.status(400).json({ error: 'Peso da medição deve ser maior que zero' });
    } else {
      pesoNormalizado = roundTo2(Number(MedicaoPeso));
    }

    if (!MedicaoLocal || MedicaoLocal.trim() === "") {
      return res.status(400).json({ error: 'Local é obrigatório' });
    }else{
      if (MedicaoLocal.trim() !== "esquerda" && MedicaoLocal.trim() !== "direita" && MedicaoLocal.trim() !== "ambos" && MedicaoLocal.trim() !== "centro") {
        return res.status(400).json({ error: 'Local deve ser "esquerda", "direita", "centro" ou "ambos"' });
      }
    }

    const mochila = await prisma.mochilas.findUnique({ where: { MochilaCodigo: MochilaCodigo } });
    if (!mochila) {
      return res.status(404).json({ error: 'Mochila não encontrada' });
    }

    const mId = mochila.MochilaId;

    if (! await verificarSenha(MochilaSenha, mochila.MochilaSenha)){
      return res.status(401).json({ error: 'Senha da mochila incorreta' });
    }

    const mPesoMaximo = mochila.MochilaPesoMax;

    // Tenta achar usuário ativo na mochila
    const usuarioMochila = await prisma.usuarios_Mochilas.findFirst({
      where: { 
        MochilaId: mochila.MochilaId, 
        OR: [
          { UsoStatus: 'Usando' }, 
          { UsoStatus: 'Último a Usar' }
        ]
      }
    });

    // Dados usuário
    if (!usuarioMochila) {
      return res.status(404).json({ error: 'Nenhum usuário ativo para esta mochila' });
    }

    const uId = usuarioMochila.UsuarioId;

    const usuario = await prisma.usuarios.findUnique({
      where: { UsuarioId: uId }
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado na tabela' });
    }

    const uPeso = usuario.UsuarioPeso;

    const uPesoMaximoPorcetagem = usuario.UsuarioPesoMaximoPorcentagem;

    let uPesoMaximo = uPeso * 0.1; // 10% do peso do usuário
    if (uPesoMaximoPorcetagem || uPesoMaximoPorcetagem === null) {
      uPesoMaximo = uPeso * (uPesoMaximoPorcetagem / 100);
    }

    // Verifica se o peso da medição está dentro do limite
    let porcentagemPesoMaximo = 0;

    if (mPesoMaximo > uPesoMaximo) {
      if (MedicaoPeso > uPesoMaximo) {
        MedicaoStatus = 'Acima do limite';
        porcentagemPesoMaximo = roundTo2(((MedicaoPeso / uPesoMaximo) * 100) - 100); // Excesso em relação ao peso máximo
        MedicaoPesoMais = roundTo2(MedicaoPeso - uPesoMaximo)
      } else {
        // Caculando a porcentagem do peso em relação ao peso máximo
        porcentagemPesoMaximo = (MedicaoPeso * 100) / uPesoMaximo;
        MedicaoStatus = 'Dentro do limite';
        MedicaoPesoMais = roundTo2(uPesoMaximo - MedicaoPeso)
      }
    } else {
      if (MedicaoPeso > mPesoMaximo) {
        MedicaoStatus = 'Acima do limite da Mochila';
        porcentagemPesoMaximo = roundTo2(((MedicaoPeso / mPesoMaximo) * 100) - 100); // Excesso em relação ao peso máximo
        MedicaoPesoMais = roundTo2(MedicaoPeso - mPesoMaximo)
      } else {
        // Caculando a porcentagem do peso em relação ao peso máximo
        porcentagemPesoMaximo = (MedicaoPeso * 100) / mPesoMaximo;
        MedicaoStatus = 'Dentro do limite';
        MedicaoPesoMais = roundTo2(mPesoMaximo - MedicaoPeso)
      }
    }

    const medicao = await prisma.medicoes.create({
      data: {
        MochilaId: mId,
        UsuarioId: uId,
        MedicaoPeso: pesoNormalizado,
        MedicaoData: new Date(),
        MedicaoStatus: MedicaoStatus,
        MedicaoLocal: MedicaoLocal,
        MedicaoPesoMaximoPorcentagem: porcentagemPesoMaximo,
        MedicaoPesoMais: MedicaoPesoMais
      }
    });

    // Gerar alerta:
    if (MedicaoStatus === 'Acima do limite') {
      await prisma.alertas.create({
        data: {
          MedicaoId: medicao.MedicaoId,
          AlertaTitulo: 'Peso acima do limite recomendado para você',
          AlertaDescricao: `Peso atual está ${porcentagemPesoMaximo}% acima do limite recomendado. Sendo ${roundTo2((MedicaoPeso - uPesoMaximo))} kg a mais.`,
          AlertaNivel: 'Critico',
          AlertaData: new Date(),
          AlertaStatus: 'Enviar',
          UsuarioId: uId
        }
      });
    }else if (MedicaoStatus === 'Acima do limite da Mochila') {
      await prisma.alertas.create({
        data: {
          MedicaoId: medicao.MedicaoId,
          AlertaTitulo: 'Peso acima do limite recomendado para a mochila',
          AlertaDescricao: `Peso atual está ${porcentagemPesoMaximo}% acima do limite recomendado. Sendo ${roundTo2((MedicaoPeso - mPesoMaximo))} kg a mais.`,
          AlertaNivel: 'Critico',
          AlertaData: new Date(),
          AlertaStatus: 'Enviar',
          UsuarioId: uId
        }
      });
    }

    if (usuarioMochila.UsoStatus === 'Último a Usar'){
      await prisma.usuarios_Mochilas.update({
        where: { UsuarioId_MochilaId: { UsuarioId: uId, MochilaId: mId } },
        data: { UsoStatus: 'Usando', DataInicioUso: new Date(), DataFimUso: null }
      });
    }

    //return res.status(201).json({ ok: true, message: 'Medição registrada com sucesso' });
    return res.status(201).json(medicao);
    
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao registrar medição' });
  }
}

// Validado (31/08/2025)
export async function obterMedicoes(req, res) {
  try {
    //const {UsuarioID} = req.body;
    const medicoes = await prisma.medicoes.findMany({
      orderBy: { MedicaoData:'desc'}
    });

    if (!medicoes){
      return res.status(404).json({ error: 'Nenhuma medição encontrada' });
    }

    return res.status(200).json(medicoes);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao bucar medições' });
  }
}

// Validado (31/08/2025) / Validar corretamente com mais registros
// Últimos 7 dias
export async function obterRelatorioSemanal(req, res) {
  try {

    if (!validarSessao(req)){
      return res.status(401).json({ error: 'Sessão inválida' });
    }

    const UsuarioId = req.session.usuario.id;

    const MachilaCodigo = req.params.mochila;

    if (!MachilaCodigo || MachilaCodigo.trim() === '') {
      return res.status(400).json({ error: "Informe o código da mochila" });
    }

    const mochila = await prisma.mochilas.findUnique({ where: { MochilaCodigo: MachilaCodigo } });

    if (!mochila) {
      return res.status(404).json({ error: 'Mochila não encontrada' });
    }

    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

    const medicoes = await prisma.medicoes.findMany({
      where: { 
        UsuarioId: UsuarioId,
        MochilaId: mochila.MochilaId,
        MedicaoData: { gte: seteDiasAtras } 
      },
      select:{
        MedicaoPeso: true,
        MedicaoData: true,
        MedicaoStatus: true,
        MedicaoLocal: true,
        MedicaoPesoMaximoPorcentagem: true,
        MedicaoPesoMais: true
      },
      orderBy: { MedicaoData: 'desc' }
    });


    if (medicoes.length === 0) {
      return res.status(404).json({ error: 'Nenhuma medição encontrada nos últimos 7 dias' });
    }

    return res.status(200).json(medicoes);

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao buscar relatório semanal' });
  }
}

// Validado (31/08/2025) / Validar corretamente com mais registros
// Relatório mensal (usuário escolhe mês e ano)
export async function obterRelatorioMensal(req, res) {
  try {

    if (!validarSessao(req)){
      return res.status(401).json({ error: 'Sessão inválida' });
    }

    const UsuarioId = req.session.usuario.id;

    const MachilaCodigo = req.params.mochila;

    if (!MachilaCodigo || MachilaCodigo.trim() === '') {
      return res.status(400).json({ error: "Informe o código da mochila" });
    }

    const mochila = await prisma.mochilas.findUnique({ where: { MochilaCodigo: MachilaCodigo } });

    if (!mochila) {
      return res.status(404).json({ error: 'Mochila não encontrada' });
    }

    const { mes, ano } = req.params; // Ex: /mensal/2025/8
    if (!mes || isNaN(mes) || !ano || isNaN(ano)) {
      return res.status(400).json({ error: "Informe mês e ano" });
    }

    if (mes.length !== 2 || ano.length !== 4){
      return res.status(400).json({ error: 'Mês e/ou ano inválidos' });
    }

    const inicio = new Date(ano, mes - 1, 1);
    const fim = new Date(ano, mes, 0, 23, 59, 59);

    const medicoes = await prisma.medicoes.findMany({
      where: { 
        UsuarioId: UsuarioId,
        MochilaId: mochila.MochilaId,
        MedicaoData: { gte: inicio, lte: fim }
      },
      select:{
        MedicaoPeso: true,
        MedicaoData: true,
        MedicaoStatus: true,
        MedicaoLocal: true,
        MedicaoPesoMaximoPorcentagem: true,
        MedicaoPesoMais: true
      },
      orderBy: { MedicaoData: 'desc' }
    });

    if (medicoes.length === 0){
      return res.status(404).json({ error: 'Nenhuma medição encontrada no mês informado' });
    }
    
    return res.status(200).json(medicoes);

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao buscar relatório mensal' });
  }
}

// Validado (31/08/2025)
// Relatório anual
export async function obterRelatorioAnual(req, res) {
  try {

    if (!validarSessao(req)){
      return res.status(401).json({ error: 'Sessão inválida' });
    }

    const UsuarioId = req.session.usuario.id;

    const MachilaCodigo = req.params.mochila;

    if (!MachilaCodigo || MachilaCodigo.trim() === '') {
      return res.status(400).json({ error: "Informe o código da mochila" });
    }

    const mochila = await prisma.mochilas.findUnique({ where: { MochilaCodigo: MachilaCodigo } });

    if (!mochila) {
      return res.status(404).json({ error: 'Mochila não encontrada' });
    }

    const { ano } = req.params;
    if (!ano || isNaN(ano)){
      return res.status(400).json({ error: "Informe o ano" });
    }

    if (ano.length !== 4){
      return res.status(400).json({ error: 'Ano inválido' });
    }

    const inicio = new Date(ano, 0, 1);
    const fim = new Date(ano, 11, 31, 23, 59, 59);

    const medicoes = await prisma.medicoes.findMany({
      where: { 
        UsuarioId: UsuarioId,
        MochilaId: mochila.MochilaId,
        MedicaoData: { gte: inicio, lte: fim } 
      },
      select:{
        MedicaoPeso: true,
        MedicaoData: true,
        MedicaoStatus: true,
        MedicaoLocal: true,
        MedicaoPesoMaximoPorcentagem: true,
        MedicaoPesoMais: true
      },
      orderBy: { MedicaoData: 'desc' }
    });

    if (medicoes.length === 0){
      return res.status(404).json({ error: 'Nenhuma medição encontrada no ano informado' });
    }

    return res.status(200).json(medicoes);

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao buscar relatório anual' });
  }
}

// Validado (31/08/2025)
// Relatório de um dia específico
export async function obterRelatorioDia(req, res) {
  try {

    if (!validarSessao(req)){
      return res.status(401).json({ error: 'Sessão inválida' });
    }

    const UsuarioId = req.session.usuario.id;

    const MachilaCodigo = req.params.mochila;

    if (!MachilaCodigo || MachilaCodigo.trim() === '') {
      return res.status(400).json({ error: "Informe o código da mochila" });
    }

    const mochila = await prisma.mochilas.findUnique({ where: { MochilaCodigo: MachilaCodigo } });

    if (!mochila) {
      return res.status(404).json({ error: 'Mochila não encontrada' });
    }

    const { data } = req.params; // Ex: 2025-08-10
    if (!data) return res.status(400).json({ error: "Informe a data" });

    if (isNaN(Date.parse(data))) {
      return res.status(400).json({ error: 'Data inválida' });
    }

    const inicio = new Date(data + "T00:00:00");
    const fim = new Date(data + "T23:59:59");

    const medicoes = await prisma.medicoes.findMany({
      where: { 
        UsuarioId: UsuarioId,
        MochilaId: mochila.MochilaId,
        MedicaoData: { gte: inicio, lte: fim } 
      },
      select:{
        MedicaoPeso: true,
        MedicaoData: true,
        MedicaoStatus: true,
        MedicaoLocal: true,
        MedicaoPesoMaximoPorcentagem: true,
        MedicaoPesoMais: true
      },
      orderBy: { MedicaoData: 'desc' }
    });

    if (medicoes.length === 0){
      return res.status(404).json({ error: 'Nenhuma medição encontrada no dia informado' });
    }

    return res.status(200).json(medicoes);

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao buscar relatório diário' });
  }
}

// Validado (31/08/2025)
// Dia com maior e menor peso registrado
export async function obterDiaMaisMenosPeso(req, res) {
  try {

    if (!validarSessao(req)){
      return res.status(401).json({ error: 'Sessão inválida' });
    }

    const UsuarioId = req.session.usuario.id;

    const MachilaCodigo = req.params.mochila;

    if (!MachilaCodigo || MachilaCodigo.trim() === '') {
      return res.status(400).json({ error: "Informe o código da mochila" });
    }

    const mochila = await prisma.mochilas.findUnique({ where: { MochilaCodigo: MachilaCodigo } });

    if (!mochila) {
      return res.status(404).json({ error: 'Mochila não encontrada' });
    }

    const maisPeso = await prisma.medicoes.findFirst({
      where: { 
        UsuarioId: UsuarioId,
        MochilaId: mochila.MochilaId
      },
      select:{
        MedicaoPeso: true,
        MedicaoData: true,
        MedicaoStatus: true,
        MedicaoLocal: true,
        MedicaoPesoMaximoPorcentagem: true,
        MedicaoPesoMais: true
      },
      orderBy: { MedicaoPeso: 'desc' }
    });

    const menosPeso = await prisma.medicoes.findFirst({
      where: { 
        UsuarioId: UsuarioId,
        MochilaId: mochila.MochilaId 
      },
      select:{
        MedicaoPeso: true,
        MedicaoData: true,
        MedicaoStatus: true,
        MedicaoLocal: true,
        MedicaoPesoMaximoPorcentagem: true,
        MedicaoPesoMais: true
      },
      orderBy: { MedicaoPeso: 'asc' }
    });

    if (!maisPeso && !menosPeso) {
      return res.status(404).json({ error: 'Nenhuma medição encontrada' });
    }else if (!maisPeso && menosPeso){
      return res.status(200).json({ ok: true, maisPeso: null, menosPeso: menosPeso });
    }else if (maisPeso && !menosPeso){
      return res.status(200).json({ ok: true, maisPeso: maisPeso, menosPeso: null });
    }

    return res.status(200).json({ ok: true, maisPeso, menosPeso });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao buscar dia mais/menos peso' });
  }
}

// Validado (31/08/2025)
// Buscar medições em um intervalo de datas informado pelo usuário
export async function obterMedicoesPorPeriodo(req, res) {
  try {

    if (!validarSessao(req)){
      return res.status(401).json({ error: 'Sessão inválida' });
    }

    const UsuarioId = req.session.usuario.id;

    const MachilaCodigo = req.params.mochila;

    if (!MachilaCodigo || MachilaCodigo.trim() === '') {
      return res.status(400).json({ error: "Informe o código da mochila" });
    }

    const mochila = await prisma.mochilas.findUnique({ where: { MochilaCodigo: MachilaCodigo } });

    if (!mochila) {
      return res.status(404).json({ error: 'Mochila não encontrada' });
    }

    const { inicio, fim } = req.params; // Exemplo: /periodo/2025-08-01/2025-08-15

    if (!inicio || !fim) {
      return res.status(400).json({ error: 'Datas de início e fim são obrigatórias (formato: YYYY-MM-DD)' });
    }

    if (isNaN(Date.parse(inicio)) || isNaN(Date.parse(fim))) {
      return res.status(400).json({ error: 'Datas inválidas' });
    }

    const medicoes = await prisma.medicoes.findMany({
      where: {
        UsuarioId: UsuarioId,
        MochilaId: mochila.MochilaId,
        MedicaoData: {
          gte: new Date(inicio), // >= data início
          lte: new Date(fim)     // <= data fim
        }
      },
      select:{
        MedicaoPeso: true,
        MedicaoData: true,
        MedicaoStatus: true,
        MedicaoLocal: true,
        MedicaoPesoMaximoPorcentagem: true,
        MedicaoPesoMais: true
      },
      orderBy: {
        MedicaoData: 'asc'
      }
    });

    if (medicoes.length === 0) {
      return res.status(404).json({ error: 'Nenhuma medição encontrada nesse período' });
    }

    return res.status(200).json(medicoes);

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao buscar medições por período' });
  }
}

import { prisma } from '../prisma.js';
import { roundTo2, verificarToken } from '../utils.js';

// Validado (31/08/2025) - Para testes (Desativar)
/*
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
*/

// Rota de login para o dispositivo Mochila (IoT)
/*
export async function loginMochila(req, res) {
    try {
        const { MochilaCodigo, MochilaSenha } = req.body;

        // 1. Busca a mochila pelo seu código único
        const mochila = await prisma.mochilas.findUnique({
            where: { MochilaCodigo: MochilaCodigo }
        });

        if (!mochila) {
            return res.status(404).json({ error: 'Mochila não encontrada.' });
        }

        // 2. Verifica a senha da mochila
        if (!await verificarSenha(MochilaSenha, mochila.MochilaSenha)) {
            return res.status(401).json({ error: 'Senha da mochila incorreta.' });
        }

        // Dados do payload para o JWT da mochila
        const payload = {
            MochilaId: mochila.MochilaId
        };
        
        // 4. Cria o JWT com o payload e a chave secreta
        // O tempo de expiração é importante para a segurança (15m)
        const token = jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: '15m' });

        // 5. Retorna o token para o dispositivo IoT
        return res.status(200).json({ ok: true, message: 'Autenticação da mochila bem-sucedida.', token: token });

    } catch (e) {
        console.error("Erro na autenticação da mochila:", e);
        return res.status(500).json({ error: 'Erro ao autenticar a mochila.' });
    } finally {
        await prisma.$disconnect();
    }
}
*/

// Validado (15/09/2025) - Criar medição (IoT)
export async function criarMedicao(req, res) {
  try {
    const { MedicaoPeso, MedicaoLocal } = req.body;
    let MedicaoStatus, MedicaoPesoMais;

    let dadosMochila = null;
    if(! await verificarToken(req)){
        return res.status(401).json({ error: 'Mochila não autenticada' });
    }else{
        dadosMochila = await verificarToken(req);
    }

    let MochilaId =  Number(dadosMochila.MochilaId);

    const mochila = await prisma.mochilas.findUnique({ where: { MochilaId: MochilaId } });
    if (!mochila) {
      return res.status(404).json({ error: 'Mochila não encontrada' });
    }

    const mId = mochila.MochilaId;

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

    const mPesoMaximo = mochila.MochilaPesoMax;

    // Tenta achar usuário ativo na mochila
    const usuarioMochila = await prisma.usuariosMochilas.findFirst({
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
      await prisma.usuariosMochilas.update({
        where: { UsuarioId_MochilaId: { UsuarioId: uId, MochilaId: mId } },
        data: { UsoStatus: 'Usando', DataInicioUso: new Date(), DataFimUso: null }
      });
    }

    return res.status(201).json({ ok: true, message: 'Medição registrada com sucesso' });
    //return res.status(201).json(medicao);
    
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao registrar medição' });
  } finally {
      await prisma.$disconnect();
  }
}

// Validado (15/09/2025) / Validar posteriormente com mais registros
// Relatório do peso carregado com a mochila nos últimos 7 dias
export async function obterRelatorioSemanal(req, res) {
  try {

    let usuario = null;
    if (! await verificarToken(req)) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
    }else{
        usuario = await verificarToken(req);
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

    const dadosusuario = await prisma.usuarios.findUnique({ where: { UsuarioId: UsuarioId } });

    if (!dadosusuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const MachilaCodigo = req.params.mochila;

    if (!MachilaCodigo || MachilaCodigo.trim() === '') {
      return res.status(400).json({ error: "Informe o código da mochila" });
    }

    const mochila = await prisma.mochilas.findUnique({ where: { MochilaCodigo: MachilaCodigo } });

    if (!mochila) {
      return res.status(404).json({ error: 'Mochila não encontrada' });
    }

    // Verificar vinculo entre usuário e mochila
    const usuarioMochila = await prisma.usuariosMochilas.findFirst({
      where: { 
        UsuarioId: UsuarioId, 
        MochilaId: mochila.MochilaId
      }
    });

    if (!usuarioMochila) {
      return res.status(404).json({ error: 'Usuário não está vinculado a esta mochila' });
    }

    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

    // A forma mais robusta de garantir o fuso horário correto é
    // usando a data de hoje no fuso de Brasília e subtraindo 7 dias.
    // 1. Pegar a data atual no fuso de Brasília
    const hojeEmBrasilia = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));

    // 2. Subtrair 7 dias
    hojeEmBrasilia.setDate(hojeEmBrasilia.getDate() - 7);

    const medicoes = await prisma.medicoes.findMany({
      where: { 
        UsuarioId: UsuarioId,
        MochilaId: mochila.MochilaId,
        MedicaoData: { gte: hojeEmBrasilia } 
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
  } finally {
      await prisma.$disconnect();
  }
}

// Validado (15/09/2025) / Validar posteriormente com mais registros
// Relatório mensal (usuário escolhe mês e ano)
export async function obterRelatorioMensal(req, res) {
  try {

    let usuario = null;
    if (! await verificarToken(req)) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
    }else{
        usuario = await verificarToken(req);
    }

    const UsuarioId = Number(usuario.UsuarioId);

    if(!usuario.tipo){
      return res.status(403).json({ error: "Token iválido para usuário" });
    }

    if (usuario.tipo !== 'usuario'){
      return res.status(403).json({ error: "Token iválido para usuário" });
    }

    if (!UsuarioId || isNaN(UsuarioId)){
      return res.status(400).json({ error: "ID do usuário inválido" + UsuarioId });
    }

    const dadosusuario = await prisma.usuarios.findUnique({ where: { UsuarioId: UsuarioId } });

    if (!dadosusuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const MachilaCodigo = req.params.mochila;

    if (!MachilaCodigo || MachilaCodigo.trim() === '') {
      return res.status(400).json({ error: "Informe o código da mochila" });
    }

    const mochila = await prisma.mochilas.findUnique({ where: { MochilaCodigo: MachilaCodigo } });

    if (!mochila) {
      return res.status(404).json({ error: 'Mochila não encontrada' });
    }

    const { mes, ano } = req.params; // Ex: /mensal/2025/08
    if (!mes || isNaN(mes) || !ano || isNaN(ano)) {
        return res.status(400).json({ error: "Informe mês e ano" });
    }

    // A validação de mes e ano pode ser simplificada.
    // O parseInt já lida com strings como '08'.
    // if (mes.length !== 2 || ano.length !== 4){
    //   return res.status(400).json({ error: 'Mês e/ou ano inválidos' });
    // }

    // Ajuste para garantir que o mês seja tratado como número
    const mesInt = parseInt(mes);
    const anoInt = parseInt(ano);

    // Criar a data de início do mês (primeiro dia) no fuso horário de Brasília
    const inicio = new Date(`${anoInt}-${mesInt.toString().padStart(2, '0')}-01T00:00:00-03:00`);

    // Criar a data de fim (primeiro dia do próximo mês) no fuso horário de Brasília
    const fim = new Date(inicio);
    fim.setMonth(fim.getMonth() + 1);

    const medicoes = await prisma.medicoes.findMany({
        where: { 
            UsuarioId: UsuarioId,
            MochilaId: mochila.MochilaId,
            MedicaoData: { 
                gte: inicio, // >= primeiro dia do mês no Brasil
                lt: fim // < primeiro dia do próximo mês no Brasil
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
      orderBy: { MedicaoData: 'desc' }
    });

    if (medicoes.length === 0){
      return res.status(404).json({ error: 'Nenhuma medição encontrada no mês informado' });
    }
    
    return res.status(200).json(medicoes);

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao buscar relatório mensal' });
  } finally {
      await prisma.$disconnect();
  }
}

// Validado (15/09/2025) / Validar posteriormente com mais registros
// Relatório anual
export async function obterRelatorioAnual(req, res) {
  try {

    let usuario = null;
    if (! await verificarToken(req)) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
    }else{
        usuario = await verificarToken(req);
    }

    const UsuarioId = Number(usuario.UsuarioId);

    if(!usuario.tipo){
      return res.status(403).json({ error: "Token iválido para usuário" });
    }

    if (usuario.tipo !== 'usuario'){
      return res.status(403).json({ error: "Token iválido para usuário" });
    }

    if (!UsuarioId || isNaN(UsuarioId)){
      return res.status(400).json({ error: "ID do usuário inválido" + UsuarioId });
    }

    const dadosusuario = await prisma.usuarios.findUnique({ where: { UsuarioId: UsuarioId } });

    if (!dadosusuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

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

    // Criar a data de início do ano (1 de janeiro) no fuso horário de Brasília
    const inicio = new Date(`${ano}-01-01T00:00:00-03:00`);

    // Criar a data de fim do ano (1 de janeiro do ano seguinte) no fuso horário de Brasília
    const fim = new Date(`${parseInt(ano) + 1}-01-01T00:00:00-03:00`);

    const medicoes = await prisma.medicoes.findMany({
      where: { 
        UsuarioId: UsuarioId,
        MochilaId: mochila.MochilaId,
        MedicaoData: { 
          gte: inicio, // >= 1 de janeiro do ano informado no Brasil
          lt: fim // < 1 de janeiro do ano seguinte no Brasil
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
      orderBy: { MedicaoData: 'desc' }
    });

    if (medicoes.length === 0){
      return res.status(404).json({ error: 'Nenhuma medição encontrada no ano informado' });
    }

    return res.status(200).json(medicoes);

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao buscar relatório anual' });
  } finally {
      await prisma.$disconnect();
  }
}

// Validado (15/09/2025) / Validar posteriormente com mais registros
// Relatório de um dia específico
export async function obterRelatorioDia(req, res) {
  try {

    let usuario = null;
    if (! await verificarToken(req)) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
    }else{
        usuario = await verificarToken(req);
    }

    const UsuarioId = Number(usuario.UsuarioId);

    if(!usuario.tipo){
      return res.status(403).json({ error: "Token iválido para usuário" });
    }

    if (usuario.tipo !== 'usuario'){
      return res.status(403).json({ error: "Token iválido para usuário" });
    }

    if (!UsuarioId || isNaN(UsuarioId)){
      return res.status(400).json({ error: "ID do usuário inválido" + UsuarioId });
    }

    const dadosusuario = await prisma.usuarios.findUnique({ where: { UsuarioId: UsuarioId } });

    if (!dadosusuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

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

    // Criar a data de início no fuso horário de Brasília
    const inicio = new Date(data + 'T00:00:00-03:00');

    // Criar a data de fim (adicionando um dia)
    const fim = new Date(data + 'T00:00:00-03:00');
    fim.setDate(fim.getDate() + 1);

    const medicoes = await prisma.medicoes.findMany({
      where: { 
        UsuarioId: UsuarioId,
        MochilaId: mochila.MochilaId,
        MedicaoData: { 
          gte: inicio, // >= meia-noite do dia informado no Brasil
          lt: fim // < meia-noite do dia seguinte no Brasil
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
      orderBy: { MedicaoData: 'desc' }
    });

    if (medicoes.length === 0){
      return res.status(404).json({ error: 'Nenhuma medição encontrada no dia informado' });
    }

    return res.status(200).json(medicoes);

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao buscar relatório diário' });
  } finally {
      await prisma.$disconnect();
  }
}

// Validado (15/09/2025) / Validar posteriormente com mais registros
// Dia com maior e menor peso registrado
export async function obterDiaMaisMenosPeso(req, res) {
  try {

    let usuario = null;
    if (! await verificarToken(req)) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
    }else{
        usuario = await verificarToken(req);
    }

    const UsuarioId = Number(usuario.UsuarioId);

    if(!usuario.tipo){
      return res.status(403).json({ error: "Token iválido para usuário" });
    }

    if (usuario.tipo !== 'usuario'){
      return res.status(403).json({ error: "Token iválido para usuário" });
    }

    if (!UsuarioId || isNaN(UsuarioId)){
      return res.status(400).json({ error: "ID do usuário inválido" + UsuarioId });
    }

    const dadosusuario = await prisma.usuarios.findUnique({ where: { UsuarioId: UsuarioId } });

    if (!dadosusuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

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
  } finally {
      await prisma.$disconnect();
  }
}

// Validado (15/09/2025) / Validar posteriormente com mais registros
// Buscar medições em um intervalo de datas informado pelo usuário
export async function obterMedicoesPorPeriodo(req, res) {
  try {

    let usuario = null;
    if (! await verificarToken(req)) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
    }else{
        usuario = await verificarToken(req);
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

    const dadosusuario = await prisma.usuarios.findUnique({ where: { UsuarioId: UsuarioId } });

    if (!dadosusuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const MachilaCodigo = req.params.mochila;

    if (!MachilaCodigo || MachilaCodigo.trim() === '') {
      return res.status(400).json({ error: "Informe o código da mochila" });
    }

    const mochila = await prisma.mochilas.findUnique({ where: { MochilaCodigo: MachilaCodigo } });

    if (!mochila) {
      return res.status(404).json({ error: 'Mochila não encontrada' });
    }

    const { inicio, fim } = req.params;

    if (!inicio || !fim) {
        return res.status(400).json({ error: 'Datas de início e fim são obrigatórias (formato: YYYY-MM-DD)' });
    }

    if (isNaN(Date.parse(inicio)) || isNaN(Date.parse(fim))) {
        return res.status(400).json({ error: 'Datas inválidas' });
    }

    // 1. Criar a data de início no fuso horário local (Brasil)
    // O construtor com YYYY-MM-DD já cria a data na meia-noite do fuso local
    const dataInicio = new Date(inicio + 'T00:00:00-03:00'); // -03:00 é o fuso do horário de Brasília (BRT)

    // 2. Criar a data de fim no fuso horário local e adicionar 1 dia
    // Isso garante que todos os dados do último dia sejam incluídos
    const dataFim = new Date(fim + 'T00:00:00-03:00');
    dataFim.setDate(dataFim.getDate() + 1);

    const medicoes = await prisma.medicoes.findMany({
        where: {
            UsuarioId: UsuarioId,
            MochilaId: mochila.MochilaId,
            MedicaoData: {
                gte: dataInicio, // >= meia-noite do dia de início (no Brasil)
                lt: dataFim      // < meia-noite do dia seguinte (no Brasil)
            }
        },
        select: {
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
  } finally {
      await prisma.$disconnect();
  }
}

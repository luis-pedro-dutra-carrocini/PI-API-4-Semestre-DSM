import { prisma } from '../prisma.js';
import { roundTo2, verificarToken, calcularEstatisticas, calcularRegressaoLinear, processarMedicoes, calcularTotaisBrutosParaEstatisticas, calcularValoresParaRegressao, groupByWeekday } from '../utils.js';

// Rota para criar medições em lote, para popular o banco de dados (Desativar após uso)

export async function criarMedicoesLote(req, res) {
  try {
    const { medicoes } = req.body;

    if (!Array.isArray(medicoes) || medicoes.length === 0) {
      return res.status(400).json({ error: "Envie um array de medições válidas." });
    }

    const dadosMochila = await verificarToken(req);
    if (!dadosMochila || dadosMochila.tipo !== "iot") {
      return res.status(401).json({ error: "Token inválido ou mochila não autenticada." });
    }

    const MochilaId = Number(dadosMochila.MochilaId);
    const mochila = await prisma.mochilas.findUnique({ where: { MochilaId } });
    if (!mochila) {
      return res.status(404).json({ error: "Mochila não encontrada." });
    }

    const usuarioMochila = await prisma.usuariosMochilas.findFirst({
      where: {
        MochilaId,
        OR: [{ UsoStatus: "Usando" }, { UsoStatus: "Último a Usar" }],
      },
    });

    if (!usuarioMochila) {
      return res.status(404).json({ error: "Nenhum usuário ativo para esta mochila." });
    }

    const uId = usuarioMochila.UsuarioId;
    const usuario = await prisma.usuarios.findUnique({ where: { UsuarioId: uId } });
    if (!usuario) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    const uPeso = usuario.UsuarioPeso || 1;
    const uPesoMaximoPorcentagem = usuario.UsuarioPesoMaximoPorcentagem || 10;
    let uPesoMaximo = uPeso * (uPesoMaximoPorcentagem / 100);

    const medicoesProcessadas = [];

    for (const m of medicoes) {
      const { MedicaoPeso, MedicaoLocal, MedicaoData } = m;
      if (!MedicaoPeso || isNaN(MedicaoPeso) || MedicaoPeso < 0) continue;
      if (!MedicaoLocal || !["esquerda", "direita", "centro", "ambos"].includes(MedicaoLocal.trim().toLowerCase())) continue;
      if (!MedicaoData) continue;

      const dataConvertida = new Date(MedicaoData);
      if (isNaN(dataConvertida.getTime())) continue;

      let mPesoMaximo = mochila.MochilaPesoMax || 1;
      let local = MedicaoLocal.trim().toLowerCase();

      if (["esquerda", "direita"].includes(local)) {
        uPesoMaximo = Math.max(1, uPesoMaximo / 2);
        mPesoMaximo = Math.max(1, mPesoMaximo / 2);
      }

      let MedicaoStatus = "Dentro do limite";
      let MedicaoPesoMais = 0;
      let porcentagemPesoMaximo = 0;

      if (mPesoMaximo >= uPesoMaximo) {
        if (MedicaoPeso > uPesoMaximo) {
          MedicaoStatus = "Acima do limite";
          porcentagemPesoMaximo = ((MedicaoPeso / uPesoMaximo) * 100) - 100;
          MedicaoPesoMais = MedicaoPeso - uPesoMaximo;
        } else {
          porcentagemPesoMaximo = (MedicaoPeso * 100) / uPesoMaximo;
          MedicaoPesoMais = uPesoMaximo - MedicaoPeso;
        }
      } else {
        if (MedicaoPeso > mPesoMaximo) {
          MedicaoStatus = "Acima do limite da Mochila";
          porcentagemPesoMaximo = ((MedicaoPeso / mPesoMaximo) * 100) - 100;
          MedicaoPesoMais = MedicaoPeso - mPesoMaximo;
        } else {
          porcentagemPesoMaximo = (MedicaoPeso * 100) / mPesoMaximo;
          MedicaoPesoMais = mPesoMaximo - MedicaoPeso;
        }
      }

      // Limites de segurança
      porcentagemPesoMaximo = Math.min(Math.max(porcentagemPesoMaximo, 0), 999.99);
      MedicaoPesoMais = Math.min(Math.max(MedicaoPesoMais, 0), 999.99);

      medicoesProcessadas.push({
        MochilaId,
        UsuarioId: uId,
        MedicaoPeso: Number(MedicaoPeso.toFixed(2)),
        MedicaoData: dataConvertida,
        MedicaoStatus,
        MedicaoLocal: local,
        MedicaoPesoMaximoPorcentagem: Number(porcentagemPesoMaximo.toFixed(2)),
        MedicaoPesoMais: Number(MedicaoPesoMais.toFixed(2)),
      });
    }

    if (medicoesProcessadas.length === 0) {
      return res.status(400).json({ error: "Nenhuma medição válida foi enviada." });
    }

    await prisma.medicoes.createMany({ data: medicoesProcessadas });

    return res.status(201).json({
      ok: true,
      totalMedicoes: medicoesProcessadas.length,
      message: "Medições registradas com sucesso (com segurança de limites)",
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao registrar medições em lote" });
  }
}


// Validado (15/09/2025) - Criar medição (IoT)
export async function criarMedicao(req, res) {
  try {
    const { MedicaoPeso, MedicaoLocal } = req.body;
    let MedicaoStatus, MedicaoPesoMais;

    let dadosMochila = await verificarToken(req);

    if (!dadosMochila) {
      return res.status(401).json({ error: 'Mochila não autenticada' });
    }

    if (dadosMochila.tipo !== 'iot') {
      return res.status(403).json({ error: "Token iválido para mochila" });
    }

    let MochilaId = Number(dadosMochila.MochilaId);

    const mochila = await prisma.mochilas.findUnique({ where: { MochilaId: MochilaId } });
    if (!mochila) {
      return res.status(404).json({ error: 'Mochila não encontrada' });
    }

    const mId = mochila.MochilaId;

    let pesoNormalizado;
    if (MedicaoPeso == null || MedicaoPeso === '' || isNaN(MedicaoPeso)) {
      return res.status(400).json({ error: 'Peso é obrigatório' });
    } else if (MedicaoPeso < 0) {
      return res.status(400).json({ error: 'Peso da medição deve ser maior ou igual a zero' });
    } else {
      pesoNormalizado = roundTo2(Number(MedicaoPeso));
    }

    if (!MedicaoLocal || MedicaoLocal.trim() === "") {
      return res.status(400).json({ error: 'Local é obrigatório' });
    } else {
      if (MedicaoLocal.trim() !== "esquerda" && MedicaoLocal.trim() !== "direita" && MedicaoLocal.trim() !== "ambos" && MedicaoLocal.trim() !== "centro") {
        return res.status(400).json({ error: 'Local deve ser "esquerda", "direita", "centro" ou "ambos"' });
      }
    }

    let mPesoMaximo = mochila.MochilaPesoMax;

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

    if (MedicaoLocal.trim() === "esquerda" || MedicaoLocal.trim() === "direita") {
      // Dividir o peso por 2
      uPesoMaximo = roundTo2(uPesoMaximo / 2);
      mPesoMaximo = roundTo2(mPesoMaximo / 2);
    }

    if (mPesoMaximo >= uPesoMaximo) {
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
    } else if (MedicaoStatus === 'Acima do limite da Mochila') {
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

    if (usuarioMochila.UsoStatus === 'Último a Usar') {
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
  }
}

// Validar
export async function obterUltimaMedicaoMochilaUsuario(req, res) {
  try {

    let usuario = await verificarToken(req);

    if (!usuario) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const UsuarioId = Number(usuario.UsuarioId);

    if (!usuario.tipo) {
      return res.status(403).json({ error: "Token iválido para usuário" });
    }

    if (usuario.tipo !== 'usuario') {
      return res.status(403).json({ error: "Token iválido para usuário" });
    }

    if (!UsuarioId || isNaN(UsuarioId)) {
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

    /*
    const medicaoEsquerda = await prisma.medicoes.findFirst({
      where: {
        UsuarioId: UsuarioId,
        MochilaId: mochila.MochilaId,
        MedicaoLocal: 'esquerda'
      },
      orderBy: [ { MedicaoData: 'desc' }, { MedicaoId: 'desc' } ],
      select: {
        MedicaoPeso: true,
        MedicaoData: true,
        MedicaoStatus: true,
        MedicaoLocal: true,
        MedicaoPesoMaximoPorcentagem: true,
        MedicaoPesoMais: true
      },
    });

    const medicaoDireita = await prisma.medicoes.findFirst({
      where: {
        UsuarioId: UsuarioId,
        MochilaId: mochila.MochilaId,
        MedicaoLocal: 'direita'
      },
      orderBy: [ { MedicaoData: 'desc' }, { MedicaoId: 'desc' } ],
      select: {
        MedicaoPeso: true,
        MedicaoData: true,
        MedicaoStatus: true,
        MedicaoLocal: true,
        MedicaoPesoMaximoPorcentagem: true,
        MedicaoPesoMais: true
      },
    });

    const medicaoAmbos = await prisma.medicoes.findFirst({
      where: {
        UsuarioId: UsuarioId,
        MochilaId: mochila.MochilaId,
        MedicaoLocal: 'ambos'
      },
      orderBy: [ { MedicaoData: 'desc' }, { MedicaoId: 'desc' } ],
      select: {
        MedicaoPeso: true,
        MedicaoData: true,
        MedicaoStatus: true,
        MedicaoLocal: true,
        MedicaoPesoMaximoPorcentagem: true,
        MedicaoPesoMais: true
      },
    });

    const medicaoCentro = await prisma.medicoes.findFirst({
      where: {
        UsuarioId: UsuarioId,
        MochilaId: mochila.MochilaId,
        MedicaoLocal: 'centro'
      },
      orderBy: [ { MedicaoData: 'desc' }, { MedicaoId: 'desc' } ],
      select: {
        MedicaoPeso: true,
        MedicaoData: true,
        MedicaoStatus: true,
        MedicaoLocal: true,
        MedicaoPesoMaximoPorcentagem: true,
        MedicaoPesoMais: true
      },
    });
    */

    const locais = ['esquerda', 'direita', 'ambos', 'centro'];

    const consultas = locais.map(local =>
      prisma.medicoes.findFirst({
        where: { UsuarioId, MochilaId: mochila.MochilaId, MedicaoLocal: local },
        orderBy: [{ MedicaoData: 'desc' }, { MedicaoId: 'desc' }],
        select: {
          MedicaoPeso: true,
          MedicaoData: true,
          MedicaoStatus: true,
          MedicaoLocal: true,
          MedicaoPesoMaximoPorcentagem: true,
          MedicaoPesoMais: true
        }
      })
    );

    const [medicaoEsquerda, medicaoDireita, medicaoAmbos, medicaoCentro] = await Promise.all(consultas);

    return res.status(200).json({ ok: true, esquerda: medicaoEsquerda, direita: medicaoDireita, ambos: medicaoAmbos, centro: medicaoCentro });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao buscar medições' });
  }
}

// Relatório do peso carregado com a mochila nos últimos 7 dias
export async function obterRelatorioSemanal(req, res) {
  try {

    let usuario = await verificarToken(req);

    if (!usuario) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
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
      select: {
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

// Previsão do peso para um dia específico da semana
// Previsão do peso para um dia específico da semana
export async function obterPrevisaoPorDia(req, res) {
  try {
    let usuario = null;
    if (!await verificarToken(req)) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    } else {
      usuario = await verificarToken(req);
    }


    const UsuarioId = Number(usuario.UsuarioId);

    if (!usuario.tipo || usuario.tipo !== 'usuario') {
      return res.status(403).json({ error: "Token inválido para usuário" });
    }

    if (!UsuarioId || isNaN(UsuarioId)) {
      return res.status(400).json({ error: "ID do usuário inválido" });
    }


    const dadosusuario = await prisma.usuarios.findUnique({ where: { UsuarioId: UsuarioId } });

    if (!dadosusuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const MochilaCodigo = req.params.mochila;
    const dataAlvo = new Date(req.params.data);


    if (!MochilaCodigo || MochilaCodigo.trim() === '') {
      return res.status(400).json({ error: "Informe o código da mochila" });
    }


    if (!dataAlvo || isNaN(dataAlvo.getTime())) {
      return res.status(400).json({ error: "Data inválida" });
    }

    const mochila = await prisma.mochilas.findUnique({ where: { MochilaCodigo: MochilaCodigo } });


    if (!mochila) {
      return res.status(404).json({ error: 'Mochila não encontrado' });
    }

    // Verificar vínculo entre usuário e mochila
    const usuarioMochila = await prisma.usuariosMochilas.findFirst({
      where: {
        UsuarioId: UsuarioId,
        MochilaId: mochila.MochilaId
      }
    });


    if (!usuarioMochila) {
      return res.status(404).json({ error: 'Usuário não está vinculado a esta mochila' });
    }

    // Buscar todas as medições
    const medicoes = await prisma.medicoes.findMany({
      where: {
        UsuarioId: UsuarioId,
        MochilaId: mochila.MochilaId,
      },
      select: {
        MedicaoPeso: true,
        MedicaoData: true,
        MedicaoStatus: true,
        MedicaoLocal: true,
      },
      orderBy: { MedicaoData: 'asc' }
    });


    if (medicoes.length === 0) {
      return res.status(404).json({
        error: 'Nenhuma medição encontrada',
        previsao: null,
        estatisticas: null,
        motivo: "Não existem medições para cálculo"
      });
    }

    // 🟢 CORREÇÃO: Determina o dia da semana da data alvo (0=Domingo ... 6=Sábado)
    // Usando UTC para evitar problemas de timezone
    const weekdayEscolhido = dataAlvo.getUTCDay();


    // 🟢 CORREÇÃO: Filtra todas as medições que têm o mesmo dia da semana (usando UTC)
    const medicoesMesmoWeekday = medicoes.filter((m) => {
      const d = new Date(m.MedicaoData);
      const diaMedicao = d.getUTCDay();
      return diaMedicao === weekdayEscolhido;
    });



    // 🟢 DEBUG: Mostrar os dias das primeiras medições

    medicoes.slice(0, 10).forEach((m, i) => {
      const d = new Date(m.MedicaoData);
    });



    if (medicoesMesmoWeekday.length === 0) {
      return res.status(200).json({
        previsao: null,
        estatisticas: null,
        motivo: "Não existem medições com o mesmo dia da semana do escolhido."
      });
    }

    // 🟢 CORREÇÃO: Agrupar por data (yyyy-mm-dd) usando UTC
    const mapaPorData = {};
    medicoesMesmoWeekday.forEach((m) => {
      const d = new Date(m.MedicaoData);
      const y = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(d.getUTCDate()).padStart(2, "0");
      const key = `${y}-${mm}-${dd}`;
      if (!mapaPorData[key]) mapaPorData[key] = [];
      mapaPorData[key].push(m);
    });




    // Para cada data: agrupar por hora:minuto e calcular média esquerda/direita
    const totaisPorDia = Object.entries(mapaPorData).map(([dataStr, lista]) => {
      // Agrupa por hora:minuto
      const mapaHoraMin = {};
      lista.forEach((item) => {
        const d = new Date(item.MedicaoData);
        const h = String(d.getUTCHours()).padStart(2, "0");
        const min = String(d.getUTCMinutes()).padStart(2, "0");
        const chave = `${h}:${min}`;
        if (!mapaHoraMin[chave]) mapaHoraMin[chave] = [];
        mapaHoraMin[chave].push(item);
      });

      // Para cada hora:minuto, calcular média das medições esquerda/direita
      const mediasHorarias = Object.values(mapaHoraMin).map((arr) => {
        const esquerda = arr.filter((v) =>
          v.MedicaoLocal?.toLowerCase().includes("esquerda") ||
          v.MedicaoLocal?.toLowerCase().includes("esq")
        );
        const direita = arr.filter((v) =>
          v.MedicaoLocal?.toLowerCase().includes("direita") ||
          v.MedicaoLocal?.toLowerCase().includes("dir")
        );
        const ambos = arr.filter((v) =>
          v.MedicaoLocal?.toLowerCase().includes("ambos") ||
          v.MedicaoLocal?.toLowerCase().includes("centro")
        );

        let pesoEsq = 0;
        let pesoDir = 0;

        if (esquerda.length > 0) {
          pesoEsq = esquerda.reduce((acc, v) => acc + Number(v.MedicaoPeso || 0), 0) / esquerda.length;
        }

        if (direita.length > 0) {
          pesoDir = direita.reduce((acc, v) => acc + Number(v.MedicaoPeso || 0), 0) / direita.length;
        }

        // Se tem medições de "ambos", adiciona aos dois lados
        if (ambos.length > 0) {
          const pesoAmbos = ambos.reduce((acc, v) => acc + Number(v.MedicaoPeso || 0), 0) / ambos.length;
          pesoEsq += pesoAmbos;
          pesoDir += pesoAmbos;
        }

        return pesoEsq + pesoDir;
      });

      // Média do dia = soma das médias horárias ÷ quantidade de horários com medição
      const mediaDia = mediasHorarias.length > 0
        ? mediasHorarias.reduce((a, b) => a + b, 0) / mediasHorarias.length
        : 0;

      return roundTo2(mediaDia);
    }).filter(val => val > 0); // Remove dias com média zero




    // Calcular estatísticas
    if (totaisPorDia.length <= 1) {
      const statsParciais = calcularEstatisticas(totaisPorDia);
      return res.status(200).json({
        previsao: null,
        estatisticas: statsParciais ? {
          ...statsParciais,
          totalMedicoes: totaisPorDia.length
        } : null,
        motivo: "Dados insuficientes: é necessário pelo menos 2 dias com medições para esse dia da semana."
      });
    }

    const estatisticas = calcularEstatisticas(totaisPorDia);
    const statsCompletas = {
      ...estatisticas,
      totalMedicoes: totaisPorDia.length
    };



    // Critério de validade: assimetria populacional em módulo <= 1
    const skew = estatisticas?.assimetria ?? 0;
    if (Math.abs(skew) > 1) {
      return res.status(200).json({
        previsao: null,
        estatisticas: statsCompletas,
        motivo: `Os dados apresentam alta assimetria (assimetria = ${estatisticas.assimetria}). Isso reduz a confiabilidade da previsão.`
      });
    }

    // Previsão válida
    const previsao = {
      media: estatisticas.media,
      n: totaisPorDia.length,
      dataAlvo: dataAlvo.toISOString(),
      diaSemana: weekdayEscolhido,
      nomeDia: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][weekdayEscolhido]
    };

    return res.status(200).json({
      previsao,
      estatisticas: statsCompletas,
      motivo: null
    });

  } catch (e) {
    console.error('Erro na previsão:', e);
    return res.status(500).json({ error: 'Erro ao calcular previsão' });
  } finally {
    await prisma.$disconnect();
  }
}

// Relatório geral com todas as medições do usuário com detrminada mochila
// Usado para o relatório geral semanal
export async function obterRelatorioGeral(req, res) {
  try {
    let usuario = await verificarToken(req);

    if (!usuario) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const UsuarioId = Number(usuario.UsuarioId);

    if (!usuario.tipo || usuario.tipo !== 'usuario') {
      return res.status(403).json({ error: "Token iválido para usuário" });
    }

    if (!UsuarioId || isNaN(UsuarioId)) {
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

    // --- 1. BUSCAR TODAS AS MEDIÇÕES ---
    // Buscamos todos os registros, pois eles são necessários para o cálculo e o agrupamento.
    const medicoes = await prisma.medicoes.findMany({
      where: {
        UsuarioId: UsuarioId,
        MochilaId: mochila.MochilaId,
      },
      select: {
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
      return res.status(404).json({ error: 'Nenhuma medição encontrada', estatisticas: null, agrupadoPorDia: [] });
    }

    // 🎯 2. CALCULAR TOTAIS BRUTOS EM MEMÓRIA (Correto, pois 'medicoes' já está aqui)
    const totalPesoBruto = roundTo2(
      medicoes.reduce((acc, curr) => {
        const peso = Number(curr.MedicaoPeso);
        // Só soma se for um número válido e finito
        return acc + (Number.isFinite(peso) ? peso : 0);
      }, 0)
    );
    const totalMedicoesBrutas = (medicoes.length) / 2;


    // --- 3. CALCULAR ESTATÍSTICAS (Baseadas na Amostra Agregada por Minuto) ---
    // Calcula a média de peso por minuto (retorna o array, por exemplo, de 265 elementos)
    const totaisMinuto = calcularTotaisBrutosParaEstatisticas(medicoes);

    // Calcula as estatísticas (média, mediana, desvio) baseadas nos totaisMinuto
    const estatisticas = calcularEstatisticas(totaisMinuto);

    const { x, y } = calcularValoresParaRegressao(totaisMinuto);
    let regressao = null;
    if (x.length >= 2) {
      regressao = calcularRegressaoLinear(x, y);
    }

    if (estatisticas) {
      estatisticas.regressao = regressao;

      // 🎯 4. INJETAR OS VALORES BRUTOS (Sobrescrever os totais da amostra)
      estatisticas.totalMedicoes = totalMedicoesBrutas;
      estatisticas.totalPeso = totalPesoBruto;
    }

    // --- 5. AGRUPAR POR DIA DA SEMANA E PROCESSAR DETALHES ---
    const agrupadoPorDia = groupByWeekday(medicoes);

    // --- 6. RETORNAR O OBJETO PRÉ-PROCESSADO E LIMPO ---
    return res.status(200).json({
      estatisticas: estatisticas,
      agrupadoPorDia: agrupadoPorDia
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao buscar relatório geral' });
  }
}

// Relatório mensal (usuário escolhe mês e ano)
export async function obterRelatorioMensal(req, res) {
  try {
    let usuario = await verificarToken(req);

    if (!usuario) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const UsuarioId = Number(usuario.UsuarioId);

    if (!usuario.tipo || usuario.tipo !== 'usuario') {
      return res.status(403).json({ error: "Token iválido para usuário" });
    }

    if (!UsuarioId || isNaN(UsuarioId)) {
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

    const mesInt = parseInt(mes);
    const anoInt = parseInt(ano);

    // Criar a data de início do mês (primeiro dia) no fuso horário de Brasília (-03:00)
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
      select: {
        MedicaoPeso: true,
        MedicaoData: true,
        MedicaoStatus: true,
        MedicaoLocal: true,
        MedicaoPesoMaximoPorcentagem: true,
        MedicaoPesoMais: true
      },
      orderBy: { MedicaoData: 'desc' }
    });

    // ########## EXECUTAR CÁLCULOS AQUI ##########

    // Obter os dados necessários para o cálculo, garantindo valores padrão
    const pesoUsuario = dadosusuario.UsuarioPeso || 70;
    const porcentagemMaxima = dadosusuario.UsuarioPesoMaximoPorcentagem || 10;

    const resultadoProcessado = processarMedicoes(medicoes, pesoUsuario, porcentagemMaxima);

    // ########## RETORNAR DADOS PROCESSADOS ##########
    // Retorna 200 mesmo se não houver medições, mas com dados processados zerados
    return res.status(200).json(resultadoProcessado);

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao buscar e processar relatório mensal' });
  }
}

// Anual Atualizado
export async function obterRelatorioAnual(req, res) {
  try {
    const usuario = await verificarToken(req);
    if (!usuario) return res.status(401).json({ error: "Usuário não autenticado" });
    if (usuario.tipo !== "usuario")
      return res.status(403).json({ error: "Token inválido para usuário" });

    const UsuarioId = Number(usuario.UsuarioId);
    if (!UsuarioId || isNaN(UsuarioId))
      return res.status(400).json({ error: "ID do usuário inválido" });

    const dadosusuario = await prisma.usuarios.findUnique({ where: { UsuarioId } });
    if (!dadosusuario)
      return res.status(404).json({ error: "Usuário não encontrado" });

    const MachilaCodigo = req.params.mochila;
    if (!MachilaCodigo || MachilaCodigo.trim() === "")
      return res.status(400).json({ error: "Informe o código da mochila" });

    const mochila = await prisma.mochilas.findUnique({
      where: { MochilaCodigo: MachilaCodigo },
    });
    if (!mochila)
      return res.status(404).json({ error: "Mochila não encontrada" });

    const { ano } = req.params;
    if (!ano || isNaN(ano) || ano.length !== 4)
      return res.status(400).json({ error: "Ano inválido" });

    const anoInt = parseInt(ano);
    const inicio = new Date(Date.UTC(anoInt, 0, 1, 0, 0, 0));
    const fim = new Date(Date.UTC(anoInt + 1, 0, 1, 0, 0, 0));

    const medicoes = await prisma.medicoes.findMany({
      where: {
        UsuarioId,
        MochilaId: mochila.MochilaId,
        MedicaoData: { gte: inicio, lt: fim },
        MedicaoLocal: { in: ["esquerda", "direita"] },
      },
      select: {
        MedicaoPeso: true,
        MedicaoData: true,
        MedicaoLocal: true,
      },
      orderBy: { MedicaoData: "asc" },
    });

    if (!medicoes || medicoes.length === 0) {
      return res.status(200).json({
        ano: anoInt,
        mediasMensais: Array(12).fill(0),
        estatisticas: null,
        mensagem: "Sem medições registradas neste ano.",
      });
    }

    // Agrupar medições por timestamp
    const gruposPorData = {};
    for (const m of medicoes) {
      const timestamp = new Date(m.MedicaoData).getTime();
      if (!gruposPorData[timestamp]) gruposPorData[timestamp] = {};
      gruposPorData[timestamp][m.MedicaoLocal] = Number(m.MedicaoPeso);
    }

    // Combinar pares completos
    const medicoesCompletas = [];
    for (const [ts, lados] of Object.entries(gruposPorData)) {
      if (lados.esquerda !== undefined && lados.direita !== undefined) {
        const pesoTotal = lados.esquerda + lados.direita;
        medicoesCompletas.push({
          pesoTotal,
          data: new Date(Number(ts)),
        });
      }
    }

    // Agrupar por mês
    const gruposMensais = Array.from({ length: 12 }, () => []);
    for (const m of medicoesCompletas) {
      const mes = m.data.getUTCMonth();
      gruposMensais[mes].push(m.pesoTotal);
    }

    // Médias mensais
    const mediasMensais = gruposMensais.map((arr) => {
      if (arr.length === 0) return 0;
      const soma = arr.reduce((a, b) => a + b, 0);
      return Math.round((soma / arr.length) * 100) / 100;
    });

    // Estatísticas
    const valoresValidos = mediasMensais.filter(v => v > 0);
    const estatisticas = valoresValidos.length > 0 ? calcularEstatisticas(valoresValidos) : null;
    const regressao = valoresValidos.length > 0 ? calcularRegressaoLinear(valoresValidos) : null;
    if (regressao) estatisticas.regrLinear = `y = ${regressao.a}x + ${regressao.b}`;

    return res.status(200).json({
      ano: anoInt,
      mediasMensais,
      estatisticas,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao buscar relatório anual" });
  }
}

// Relatório de um dia específico
export async function obterRelatorioDia(req, res) {
  try {

    let usuario = await verificarToken(req);

    if (!usuario) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const UsuarioId = Number(usuario.UsuarioId);

    if (!usuario.tipo) {
      return res.status(403).json({ error: "Token iválido para usuário" });
    }

    if (usuario.tipo !== 'usuario') {
      return res.status(403).json({ error: "Token iválido para usuário" });
    }

    if (!UsuarioId || isNaN(UsuarioId)) {
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
      select: {
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
      return res.status(404).json({ error: 'Nenhuma medição encontrada no dia informado' });
    }

    return res.status(200).json(medicoes);

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao buscar relatório diário' });
  }
}

// Dia com maior e menor peso registrado
export async function obterDiaMaisMenosPeso(req, res) {
  try {

    let usuario = await verificarToken(req);

    if (!usuario) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const UsuarioId = Number(usuario.UsuarioId);

    if (!usuario.tipo) {
      return res.status(403).json({ error: "Token iválido para usuário" });
    }

    if (usuario.tipo !== 'usuario') {
      return res.status(403).json({ error: "Token iválido para usuário" });
    }

    if (!UsuarioId || isNaN(UsuarioId)) {
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
      select: {
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
      select: {
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
    } else if (!maisPeso && menosPeso) {
      return res.status(200).json({ ok: true, maisPeso: null, menosPeso: menosPeso });
    } else if (maisPeso && !menosPeso) {
      return res.status(200).json({ ok: true, maisPeso: maisPeso, menosPeso: null });
    }

    return res.status(200).json({ ok: true, maisPeso, menosPeso });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao buscar dia mais/menos peso' });
  }
}

// Buscar medições em um intervalo de datas informado pelo usuário
export async function obterMedicoesPorPeriodo(req, res) {
  try {

    let usuario = await verificarToken(req);

    if (!usuario) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
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
  }
}

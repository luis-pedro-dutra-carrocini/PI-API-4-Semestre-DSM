import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

/**
 * Verifica uma assinatura digital usando a chave pública.
 * @param {string} assinatura A assinatura recebida do dispositivo.
 * @param {object} dadosAssinados O objeto de dados que foi assinado.
 * @param {string} chavePublica A chave pública do dispositivo, obtida do banco de dados.
 * @returns {boolean} Retorna true se a assinatura for válida, false caso contrário.
*/
// ... (código da função loginMochila)

export function verificarAssinatura(assinatura, dadosAssinados, chavePublica) {
  try {
    const assinaturaBuffer = Buffer.from(assinatura, 'base64');

    // Garante que a string para verificação é a mesma que foi assinada
    const dadosParaVerificar = JSON.stringify(dadosAssinados, Object.keys(dadosAssinados).sort());

    // Usa RSA-SHA256, que padroniza o padding como PKCS1v15
    const verifier = crypto.createVerify('RSA-SHA256');

    verifier.update(dadosParaVerificar);

    // A verificação é simples e direta
    return verifier.verify(chavePublica, assinaturaBuffer);

  } catch (error) {
    console.error('Erro ao verificar a assinatura:', error);
    return false;
  }
}

// Middleware para verificar o token JWT em rotas protegidas ---
export async function verificarToken(req) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
      return false;
    }

    // Usa uma Promise para transformar a chamada de callback em async/await
    const payload = await new Promise((resolve, reject) => {
      jwt.verify(token, process.env.SECRET_KEY, (err, payload) => {
        if (err) {
          reject(err);
        } else {
          resolve(payload);
        }
      });
    });

    // Retorna o payload se a verificação for bem-sucedida
    return payload;
  } catch (e) {
    // Retorna false se a verificação falhar (token inválido ou expirado)
    return false;
  }
}

// Middleware para verificar o token JWT em rotas protegidas enviado via JSON ---
export async function verificarTokenJson(authToken) {
  try {
    const token = authToken && authToken.split(' ')[1];

    if (token == null) {
      return false;
    }

    // Usa uma Promise para transformar a chamada de callback em async/await
    const payload = await new Promise((resolve, reject) => {
      jwt.verify(token, process.env.SECRET_KEY, (err, payload) => {
        if (err) {
          reject(err);
        } else {
          resolve(payload);
        }
      });
    });

    // Retorna o payload se a verificação for bem-sucedida
    return payload;
  } catch (e) {
    // Retorna false se a verificação falhar (token inválido ou expirado)
    return false;
  }
}

export const verificarTokenDoCorpo = (req) => {
  try {
    return req.body.token;
  } catch {
    return null;
  }
};

export function roundTo2(value) {
  return Math.round(value * 100) / 100; // garante 2 casas
}

export function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function validarSenha(senha) {
  // Verifica tamanho
  if (senha.length < 8 || senha.length > 16) {
    return { valido: false, erro: "A senha deve ter de 8 à 16 caracteres." };
  }

  // Contadores
  const qtdMaiusculas = (senha.match(/[A-Z]/g) || []).length;
  const qtdMinusculas = (senha.match(/[a-z]/g) || []).length;
  const qtdNumeros = (senha.match(/[0-9]/g) || []).length;
  const qtdEspeciais = (senha.match(/[^A-Za-z0-9]/g) || []).length;

  if (qtdMaiusculas < 2) {
    return { valido: false, erro: "A senha deve ter pelo menos 2 letras maiúsculas." };
  }
  if (qtdMinusculas < 2) {
    return { valido: false, erro: "A senha deve ter pelo menos 2 letras minúsculas." };
  }
  if (qtdNumeros < 2) {
    return { valido: false, erro: "A senha deve ter pelo menos 2 números." };
  }
  if (qtdEspeciais < 2) {
    return { valido: false, erro: "A senha deve ter pelo menos 2 caracteres especiais." };
  }

  return { valido: true, mensagem: "Senha válida!" };
}

const SALT_ROUNDS = Number(process.env.SALT_ROUNDS) || 10; // custo da criptografia

// Gera o hash da senha
export async function hashSenha(senha) {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  const hash = await bcrypt.hash(senha, salt);
  return hash;
}

// Compara a senha informada com o hash armazenado
export async function verificarSenha(senha, hash) {
  return await bcrypt.compare(senha, hash);
}

/*
export function validarSessao(req) {
  if (req.session && req.session.usuario) {
    return true;
  }
  return false;
}
*/

/*
export async function destruirSessao(req) {
  req.session.destroy((err) => {
      if (err) {
          console.error(err);
          return false; // falha ao destruir a sessão
      }
      return true;
  }); 
}
*/

/*
export function criaSessao(req, id) {
  req.session.usuario = {
    id: id
  };
}
*/

// Calcula a diferença entre duas datas em dias, semanas, meses ou anos
// O parâmetro `decimal` define se o resultado será decimal (true) ou inteiro arredondado para baixo (false)
export function diferencaEntreDatas(data1, data2, unidade, decimal) {
  const inicio = new Date(data1);
  const fim = new Date(data2);

  if (isNaN(inicio) || isNaN(fim)) {
    return false; // datas inválidas
  }

  // Diferença em milissegundos
  const diffMs = Math.abs(fim - inicio);

  switch (unidade.toLowerCase()) {
    case "dias": {
      const dias = diffMs / (1000 * 60 * 60 * 24);
      return decimal ? dias : Math.floor(dias);
    }

    case "semanas": {
      const semanas = diffMs / (1000 * 60 * 60 * 24 * 7);
      return decimal ? semanas : Math.floor(semanas);
    }

    case "meses": {
      // Diferença em meses aproximada com dias
      const anos = fim.getFullYear() - inicio.getFullYear();
      const meses = fim.getMonth() - inicio.getMonth();
      const dias = fim.getDate() - inicio.getDate();

      let totalMeses = anos * 12 + meses + dias / 30.4375; // 30.4375 = média de dias por mês
      return decimal ? totalMeses : Math.floor(totalMeses);
    }

    case "anos": {
      // Diferença em anos considerando meses e dias
      const anos = fim.getFullYear() - inicio.getFullYear();
      const meses = fim.getMonth() - inicio.getMonth();
      const dias = fim.getDate() - inicio.getDate();

      let totalAnos = anos + meses / 12 + dias / 365.25; // 365.25 = média de dias por ano (considera bissextos)
      return decimal ? totalAnos : Math.floor(totalAnos);
    }

    default:
      return false;
  }
}

// Retorna 
/*
export function dataBrasilia() {
  const agora = new Date();

  const options = {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };

  const formatter = new Intl.DateTimeFormat("en-US", options);
  const parts = formatter.formatToParts(agora);
  const dataMap = Object.fromEntries(parts.map((p) => [p.type, p.value]));

  const year = dataMap.year;
  const month = dataMap.month;
  const day = dataMap.day;
  const hour = dataMap.hour;
  const minute = dataMap.minute;
  const second = dataMap.second;

  // Cria Date no horário LOCAL em vez de UTC
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );
}
*/

// Retorna a data e hora formatada no fuso de Brasília, se informado a data, senão retorna a data atual
export function dataBrasiliaFormatada(data = null) {
  const dt = data ? new Date(data) : new Date();

  if (isNaN(dt)) {
    throw new Error("Data inválida!");
  }

  // Converte para horário de Brasília (America/Sao_Paulo)
  const formatado = dt.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour12: false
  });

  return formatado; // Ex: "16/08/2025 14:35:12"
}

export function calcularEstatisticas(valores) {
  const validos = valores.filter((v) => typeof v === "number" && Number.isFinite(v));
  if (validos.length === 0) return null;

  const n = validos.length;
  const soma = validos.reduce((a, b) => a + b, 0);
  const media = soma / n;

  const ordenados = [...validos].sort((a, b) => a - b);
  const mediana =
    n % 2 === 0
      ? (ordenados[n / 2 - 1] + ordenados[n / 2]) / 2
      : ordenados[Math.floor(n / 2)];

  const freq = {};
  validos.forEach((v) => {
    const key = roundTo2(v).toString();
    freq[key] = (freq[key] || 0) + 1;
  });
  const maxFreq = Math.max(...Object.values(freq));
  const moda = Object.keys(freq)
    .filter((k) => freq[k] === maxFreq)
    .map((k) => Number(k));

  const variancia =
    validos.reduce((a, b) => a + Math.pow(b - media, 2), 0) / n;
  const desvioPadrao = Math.sqrt(variancia);

  const denomSkew = desvioPadrao === 0 ? 1 : Math.pow(desvioPadrao, 3);
  const denomKurt = desvioPadrao === 0 ? 1 : Math.pow(desvioPadrao, 4);

  const assimetria =
    validos.reduce((a, b) => a + Math.pow(b - media, 3), 0) / n / denomSkew;
  const curtose =
    validos.reduce((a, b) => a + Math.pow(b - media, 4), 0) / n / denomKurt - 3;

  return {
    media: roundTo2(media),
    mediana: roundTo2(mediana),
    moda: moda.length ? moda.join(", ") : "—",
    desvioPadrao: roundTo2(desvioPadrao),
    assimetria: roundTo2(assimetria),
    curtose: roundTo2(curtose),
  };
}

export function calcularRegressaoLinear(valores) {
  const n = valores.length;
  if (n < 2) return null;
  const x = Array.from({ length: n }, (_, i) => i + 1);
  const y = valores;

  const mediaX = x.reduce((a, b) => a + b, 0) / n;
  const mediaY = y.reduce((a, b) => a + b, 0) / n;

  const numerador = x.reduce(
    (acc, xi, i) => acc + (xi - mediaX) * (y[i] - mediaY),
    0
  );
  const denominador = x.reduce(
    (acc, xi) => acc + Math.pow(xi - mediaX, 2),
    0
  );

  const a = denominador === 0 ? 0 : numerador / denominador;
  const b = mediaY - a * mediaX;

  return { a: roundTo2(a), b: roundTo2(b) };
}

export const localSide = (local) => {
  if (!local) return "outro";
  const l = local.toString().toLowerCase();
  if (l.includes("esquer")) return "esquerda";
  if (l.includes("direit")) return "direita";
  if (l.includes("amb")) return "ambos";
  return "outro";
};

export const groupByDay = (dados) => {
  // Objeto que armazenará os dados agrupados.
  const map = {};

  // 🎯 CORREÇÃO: Verifica se 'dados' é um array antes de tentar iterar.
  // Se for null, undefined ou não for um array, retorna um objeto vazio.
  if (!Array.isArray(dados)) {
    return map;
  }

  // Itera sobre a lista de dados.
  // É crucial que o nome da variável aqui seja 'dados', conforme definido no argumento da função.
  dados.forEach((m) => {
    // Usa `new Date()` para garantir que o campo de data (provavelmente do Prisma) seja tratado corretamente.
    const date = new Date(m.MedicaoData);

    // Gera a chave de agrupamento no formato 'yyyy-MM-dd' (data ISO sem o tempo).
    // .toISOString() gera a data em UTC (o que é bom para consistência) e o .split('T')[0] pega apenas a data.
    const key = date.toISOString().split('T')[0];

    // Se a chave (data) ainda não existe no mapa, inicializa com um array vazio.
    if (!map[key]) {
      map[key] = [];
    }

    // Adiciona a medição atual ao array da data correspondente.
    map[key].push(m);
  });

  return map;
};

export const getDailySideAvgs = (medicoes, side) => {
  if (!medicoes || medicoes.length === 0) return [];

  const grouped = groupByDay(medicoes);

  return Object.keys(grouped)
    .sort()
    .map((day) => {
      const items = grouped[day];

      const sideItems = items
        .filter(m => {
          const local = m.MedicaoLocal?.toLowerCase();
          const targetSide = side.toLowerCase();
          // Filtra medições que pertencem ao lado ou a 'ambos'
          return local && (local.includes(targetSide) || local.includes("ambos"));
        })
        .map(m => Number(m.MedicaoPeso || 0));

      const sum = sideItems.reduce((a, b) => a + b, 0);

      let avg = sideItems.length
        ? sum / sideItems.length
        : 0;

      if (!Number.isFinite(avg)) {
        avg = 0;
      }

      return roundTo2(avg);
    });
};

export const processarMedicoes = (dados, pesoUsuario, porcentagemMaxima) => {
  if (!dados || dados.length === 0) {
    return {
      estatisticas: null,
      dadosProcessados: {
        dailyAvgs: [],
        maiorEsq: null,
        maiorDir: null,
        menorEsq: null,
        menorDir: null,
        totalMedicoes: 0,
        mediçõesAcimaLimite: 0,
        diasComMedicao: 0,
        pesoMaximoPermitido: 0,
        dailyAvgsEsq: [],
        dailyAvgsDir: [],
        dailyLabels: []
      },
    };
  }

  const grouped = groupByDay(dados);

  let maiorEsq = null;
  let maiorDir = null;
  let menorEsq = null;
  let menorDir = null;
  let totalMedicoes = 0;
  let mediçõesAcimaLimite = 0;

  const totaisMensais = [];

  // Limite de peso máximo (em kg) por mochila/ombro
  const pesoMaximoPermitido = roundTo2((pesoUsuario * (porcentagemMaxima / 100)) / 2);

  const dailyAvgs = [];
  const dailyLabels = [];

  Object.keys(grouped)
    .sort()
    .forEach((dayIso) => {
      const items = grouped[dayIso];
      const left = [];
      const right = [];

      // Converte a data ISO (ex: '2025-08-01') para o formato 'dd'
      const dayLabel = new Date(dayIso).getDate().toString().padStart(2, '0');
      dailyLabels.push(dayLabel);


      // --- Cálculo de Totais por Timestamp para as Estatísticas ---
      const mapaHoraMinuto = {};
      items.forEach(item => {
        const d = new Date(item.MedicaoData);
        const chave = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;

        if (!mapaHoraMinuto[chave]) mapaHoraMinuto[chave] = [];
        mapaHoraMinuto[chave].push(item);
      });

      Object.values(mapaHoraMinuto).forEach(lista => {
        const esq = lista.filter(v => localSide(v.MedicaoLocal) === "esquerda");
        const dir = lista.filter(v => localSide(v.MedicaoLocal) === "direita");

        const pesoEsq = esq.reduce((acc, v) => acc + Number(v.MedicaoPeso || 0), 0) / (esq.length || 1);
        const pesoDir = dir.reduce((acc, v) => acc + Number(v.MedicaoPeso || 0), 0) / (dir.length || 1);

        const total = pesoEsq + pesoDir;
        if (Number.isFinite(total)) {
          totaisMensais.push(roundTo2(total));
        }
      });
      // --- Fim Cálculo de Totais por Timestamp

      // --- Encontrando Máximo/Mínimo e Contando Limite ---
      items.forEach((m) => {
        const side = localSide(m.MedicaoLocal);
        const peso = Number(m.MedicaoPeso || 0);
        totalMedicoes++;

        if (peso > pesoMaximoPermitido) {
          mediçõesAcimaLimite++;
        }

        if (side === "esquerda" || side === "ambos") {
          left.push(peso);
        }
        if (side === "direita" || side === "ambos") {
          right.push(peso);
        }

        const data = new Date(m.MedicaoData);

        // Armazenar data ISO para retorno e processamento no front-end (parseISO)
        const medicaoDetalhada = { peso: roundTo2(peso), data: data.toISOString() };

        if (side === "esquerda" || side === "ambos") {
          if (!maiorEsq || peso > maiorEsq.peso)
            maiorEsq = { ...medicaoDetalhada, lado: "esquerda" };
          if (!menorEsq || peso < menorEsq.peso)
            menorEsq = { ...medicaoDetalhada, lado: "esquerda" };
        }
        if (side === "direita" || side === "ambos") {
          if (!maiorDir || peso > maiorDir.peso)
            maiorDir = { ...medicaoDetalhada, lado: "direita" };
          if (!menorDir || peso < menorDir.peso)
            menorDir = { ...medicaoDetalhada, lado: "direita" };
        }
      });

      // --- Cálculo da Média Diária (para o 1º gráfico) ---
      const mediaEsq = left.length
        ? left.reduce((a, b) => a + b, 0) / left.length
        : 0;
      const mediaDir = right.length
        ? right.reduce((a, b) => a + b, 0) / right.length
        : 0;

      const totalDiario = mediaEsq + mediaDir;

      let safeTotalDiario = totalDiario;
      if (!Number.isFinite(safeTotalDiario)) {
        safeTotalDiario = 0;
      }

      dailyAvgs.push(roundTo2(safeTotalDiario));
    });

  const stats = calcularEstatisticas(totaisMensais);

  // --- Cálculo da Regressão Linear com base nos totais diários ---
  const totaisDiarios = dailyAvgs.filter((v) => Number.isFinite(v));
  const regressao = calcularRegressaoLinear(totaisDiarios);

  // --- Cálculo das Médias Diárias Laterais (para o 2º gráfico) ---
  // Reutiliza a função auxiliar para garantir arrays de mesmo comprimento (alinhados com dailyLabels)
  const dailyAvgsEsq = getDailySideAvgs(dados, "esquerda");
  const dailyAvgsDir = getDailySideAvgs(dados, "direita");

  const diasComMedicao = Object.keys(grouped).length;


  // --- Retorno dos Dados Processados ---
  return {
    estatisticas: { ...stats, regressao },
    dadosProcessados: {
      dailyAvgs, // Array de médias diárias (valores)
      dailyLabels, // Array de rótulos de dias ('01', '02', etc.)
      dailyAvgsEsq, // Array de médias diárias Esquerda (valores)
      dailyAvgsDir, // Array de médias diárias Direita (valores)
      maiorEsq,
      maiorDir,
      menorEsq,
      menorDir,
      totalMedicoes,
      mediçõesAcimaLimite,
      diasComMedicao,
      pesoMaximoPermitido,
    }
  };
};

// Gera os detalhes de agrupamento por minuto/hora dentro de um conjunto de dados (Dia)
export const buildDayDetails = (items) => {
    // Lógica para agrupar as medições por minuto, calcular médias (avgLeft/avgRight/total)
    // e agrupar por blocos de 3 horas, como no frontend.
    const minuteMap = {};
    items.forEach((m) => {
        const dt = new Date(m.MedicaoData);
        if (isNaN(dt)) return;
        const hh = String(dt.getHours()).padStart(2, "0");
        const mm = String(dt.getMinutes()).padStart(2, "0");
        const minuteKey = `${hh}:${mm}`;
        if (!minuteMap[minuteKey]) minuteMap[minuteKey] = { left: [], right: [], raw: [] };
        const side = localSide(m.MedicaoLocal);
        const peso = Number(m.MedicaoPeso || 0);

        if (side === "esquerda") minuteMap[minuteKey].left.push(peso);
        else if (side === "direita") minuteMap[minuteKey].right.push(peso);
        else if (side === "ambos") {
            minuteMap[minuteKey].left.push(peso);
            minuteMap[minuteKey].right.push(peso);
        }
        minuteMap[minuteKey].raw.push(m);
    });

    const minuteKeys = Object.keys(minuteMap).sort((a, b) => {
        const [hA, mA] = a.split(":").map(Number);
        const [hB, mB] = b.split(":").map(Number);
        return hA === hB ? mA - mB : hA - hB;
    });

    const minuteEntries = minuteKeys.map((key) => {
        const obj = minuteMap[key];
        const avgLeft = obj.left.length > 0 ? obj.left.reduce((a, b) => a + b, 0) / obj.left.length : 0;
        const avgRight = obj.right.length > 0 ? obj.right.reduce((a, b) => a + b, 0) / obj.right.length : 0;
        const total = avgLeft + avgRight;

        return {
            minute: key,
            avgLeft: roundTo2(avgLeft),
            avgRight: roundTo2(avgRight),
            total: roundTo2(total),
            raw: obj.raw.map(r => ({ MedicaoData: r.MedicaoData, MedicaoPeso: r.MedicaoPeso, MedicaoLocal: r.MedicaoLocal })), // Simplifica o RAW
        };
    });

    // Lógica para agrupar em blocos de 3h, calcular sum, avg etc. (mantida do frontend)
    const blocks = {};
    minuteEntries.forEach((me) => {
        const [hh] = me.minute.split(":").map(Number);
        const blockStart = Math.floor(hh / 3) * 3;
        const hourKey = String(hh).padStart(2, "0");

        if (!blocks[blockStart]) blocks[blockStart] = { start: blockStart, end: blockStart + 3, hours: {}, minutes: [] };
        if (!blocks[blockStart].hours[hourKey]) blocks[blockStart].hours[hourKey] = [];

        blocks[blockStart].hours[hourKey].push(me);
        blocks[blockStart].minutes.push(me);
    });

    Object.keys(blocks).forEach((bk) => {
        const b = blocks[bk];
        const count = b.minutes.length;
        const sum = b.minutes.reduce((acc, m) => acc + (Number(m.total) || 0), 0);
        b.blockMinutesCount = count;
        b.blockSumTotal = roundTo2(sum);
        b.blockAvgTotal = roundTo2(count > 0 ? sum / count : 0);

        const hourKeys = Object.keys(b.hours).sort((a, b) => Number(a) - Number(b));
        const hoursSorted = {};
        hourKeys.forEach(hk => {
            hoursSorted[hk] = b.hours[hk].sort((x, y) => {
                const [hA, mA] = x.minute.split(":").map(Number);
                const [hB, mB] = y.minute.split(":").map(Number);
                if (hA === hB) return mA - mB;
                return hA - hB;
            });
        });
        b.hours = hoursSorted;
    });

    const dayMinutesCount = minuteEntries.length;
    const daySumTotal = minuteEntries.reduce((acc, m) => acc + (Number(m.total) || 0), 0);
    const dayAvgTotal = roundTo2(dayMinutesCount > 0 ? daySumTotal / dayMinutesCount : 0);

    return {
        // Retorna apenas dados agregados para o frontend consumir, não a lista bruta de minuteEntries/blocks
        daySumTotal: roundTo2(daySumTotal),
        dayAvgTotal,
        minuteEntries: minuteEntries, // Mantém para os detalhes do dia
        blocks: blocks
    };
};

// Agrupa todas as medições por Dia da Semana (Relatório Geral)
export const groupByWeekday = (lista) => {
    // Mapeamento dos dias da semana (0 = Domingo)
    const weekdayNames = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
    const map = {};

    lista.forEach((m) => {
        const dt = new Date(m.MedicaoData);
        if (isNaN(dt)) return;

        // Obtém o índice do dia da semana (0-6)
        const dayIndex = dt.getDay();
        const weekday = weekdayNames[dayIndex];

        if (!map[weekday]) map[weekday] = [];
        map[weekday].push(m);
    });

    const weekOrder = ["segunda-feira", "terça-feira", "quarta-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"];

    // Cria a estrutura final e calcula apenas a média diária necessária para o gráfico
    const orderedGroups = weekOrder
        .filter(day => map[day])
        .map(day => {
            // As medições do dia da semana são ordenadas para manter a lógica de regressão local
            const items = map[day].sort((a, b) => new Date(a.MedicaoData) - new Date(b.MedicaoData));
            
            // 🎯 GERA OS DETALHES, INCLUINDO A MÉDIA
            const details = buildDayDetails(items);

            // 🎯 RETORNA APENAS O QUE É NECESSÁRIO PARA O GRÁFICO:
            return { 
                key: day, 
                label: day, 
                mediaPeso: details.dayAvgTotal // Usamos a média calculada
            };
        });

    return orderedGroups;
};

export const calcularTotaisBrutosParaEstatisticas = (medicoesRaw) => {
    const minuteMap = {};
    medicoesRaw.forEach((m) => {
        try {
            const dt = new Date(m.MedicaoData);
            if (isNaN(dt)) return;

            const hh = String(dt.getHours()).padStart(2, "0");
            const mm = String(dt.getMinutes()).padStart(2, "0");
            const key = `${hh}:${mm}`;

            if (!minuteMap[key]) minuteMap[key] = { left: [], right: [] };

            const local = (m.MedicaoLocal || "").toString().toLowerCase();
            const peso = Number(m.MedicaoPeso || 0);

            if (local.includes("esquer")) minuteMap[key].left.push(peso);
            else if (local.includes("direit")) minuteMap[key].right.push(peso);
            else if (local.includes("amb") || local.includes("cent")) {
                minuteMap[key].left.push(peso);
                minuteMap[key].right.push(peso);
            }
        } catch (e) {
            // Ignora datas malformadas
        }
    });

    const totals = Object.keys(minuteMap).map((k) => {
        const obj = minuteMap[k];
        const avgLeft = obj.left.length ? obj.left.reduce((a, b) => a + b, 0) / obj.left.length : 0;
        const avgRight = obj.right.length ? obj.right.reduce((a, b) => a + b, 0) / obj.right.length : 0;
        // O total por minuto é a soma das médias da esquerda e direita
        return roundTo2((avgLeft || 0) + (avgRight || 0));
    }).filter(t => t > 0); // Filtra zeros

    return totals;
};

export const calcularValoresParaRegressao = (totals) => {
    const x = []; // eixo X → índices (1, 2, 3, 4, ...)
    const y = []; // eixo Y → médias válidas

    totals.forEach((valor, i) => {
        if (valor > 0 && Number.isFinite(valor)) {
            x.push(i + 1);
            y.push(valor);
        }
    });
    return { x, y };
};
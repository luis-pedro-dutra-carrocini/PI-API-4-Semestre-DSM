import bcrypt from "bcrypt";


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

export function validarSessao(req) {
  if (req.session && req.session.usuario) {
    return true;
  }
  return false;
}

export async function destruirSessao(req) {
  req.session.destroy((err) => {
      if (err) {
          console.error(err);
          return false; // falha ao destruir a sessão
      }
      return true;
  }); 
}

export function criaSessao(req, id) {
  req.session.usuario = {
    id: id
  };
}

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
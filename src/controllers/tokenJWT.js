// tokenJWT.js
import { prisma } from "../prisma.js";
import jwt from "jsonwebtoken";
import { verificarToken, verificarTokenDoCorpo } from "../utils.js";

// Função auxiliar para verificar token puro (sem "Bearer ")
function verificarTokenPuro(token) {
  if (!token) return false;
  try {
    const payload = jwt.verify(token, process.env.SECRET_KEY);
    return payload;
  } catch (e) {
    return false;
  }
}

// Validado (20/09/2025)
export async function validarToken(req, res) {
  try {
    if (!await verificarToken(req)) {
      console.log('Usuário não autenticado');
      return res.status(401).json({ error: 'Usuário não autenticado' });
    } else {
      console.log('Token válido. Usuário autenticado');
      return res.status(200).json({ ok: true, message: 'Token válido. Usuário autenticado' });
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao validar token' });
  }
}

// Validado (20/09/2025)
export async function refresh(req, res) {
  try {
    const refreshToken = verificarTokenDoCorpo(req); // ← já retorna o token puro

    if (!refreshToken) {
      console.log('Token de refresh não fornecido');
      return res.status(400).json({ error: 'Token de refresh não fornecido.' });
    }

    // 1. Verifica se está revogado
    const tokenRevogado = await prisma.tokensRevogados.findUnique({
      where: { token: refreshToken }
    });

    if (tokenRevogado) {
      console.log('Token de refresh revogado');
      return res.status(401).json({ error: 'Token de refresh revogado.' });
    }

    // 2. Valida o token puro (sem "Bearer ")
    const token = verificarTokenPuro(refreshToken);
    if (!token) {
      console.log('Token de refresh inválido ou expirado');
      return res.status(401).json({ error: 'Token de refresh inválido ou expirado.' });
    }

    if (!token.nivel || token.nivel !== 'refresh') {
      console.log('Token de refresh com nível inválido');
      return res.status(401).json({ error: 'Token de refresh inválido' });
    }

    let payload = {};
    if (token.UsuarioId && token.UsuarioEmail && token.tipo === 'usuario') {
      payload = {
        UsuarioId: token.UsuarioId,
        UsuarioEmail: token.UsuarioEmail,
        tipo: 'usuario',
      };
    } else if (token.MochilaCodigo && token.MochilaId && token.tipo === 'iot') {
      payload = {
        MochilaId: token.MochilaId,
        MochilaCodigo: token.MochilaCodigo,
        tipo: 'iot',
      };
    } else {
      console.log('Tipo de token de refresh inválido');
      return res.status(401).json({ error: 'Tipo de token de refresh inválido' });
    }

    const newAccessToken = jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: '15m' });

    return res.status(200).json({
      ok: true,
      message: 'Access token renovado com sucesso.',
      accessToken: newAccessToken
    });

  } catch (e) {
    if (e.name === 'TokenExpiredError') {
      console.log('Token de refresh expirado');
      return res.status(401).json({ error: 'Token de refresh expirado. Por favor, faça login novamente.' });
    }
    console.error("Erro ao renovar o token:", e);
    return res.status(401).json({ error: 'Token de refresh inválido.' });
  }
}
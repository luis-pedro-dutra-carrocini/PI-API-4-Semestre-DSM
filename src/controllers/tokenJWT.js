import { prisma } from "../prisma.js";
import jwt from "jsonwebtoken";
import { verificarToken, verificarTokenJson, verificarTokenDoCorpo } from "../utils.js";

// Validado (20/09/2025)
// Verificar se token ainda está valido
export async function validarToken(req, res) {
    try {

        if (! await verificarToken(req)) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        } else {
            return res.status(200).json({ ok: true, message: 'Token válido. Usuário autenticado' });
        }

    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Erro ao realizar login' });
    } finally {
        await prisma.$disconnect();
    }
}

// Validado (20/09/2025)
// Esta rota recebe um Refresh Token e, se ele for válido e não estiver revogado,
// gera um novo Access Token para o cliente.
export async function refresh(req, res) {
    try {

        const refreshToken = await verificarTokenDoCorpo(req);

        if (!refreshToken) {
            return res.status(400).json({ error: 'Token de refresh não fornecido.' });
        }

        // 1. Verifica se o token está na lista de revogados (blacklist)
        const tokenRevogado = await prisma.tokensRevogados.findUnique({
            where: { token: refreshToken }
        });

        if (tokenRevogado) {
            return res.status(401).json({ error: 'Token de refresh revogado.' });
        }

        // 2. Verifica se o token de refresh é válido e não está expirado.
        const token = await verificarTokenJson(refreshToken);
        if (!token) {
            return res.status(401).json({ error: 'Token de refresh inválido ou expirado.' });
        }

        let payload = {};
        if (token.UsuarioId && token.UsuarioEmail && token.tipo === 'usuario') {
            payload = {
                UsuarioId: token.UsuarioId,
                UsuarioEmail: token.UsuarioEmail,
                tipo: 'usuario', // Adiciona um tipo para diferenciar do token de IoT
            };
        }else if (token.MochilaCodigo && token.MochilaId && token.tipo === 'iot') {
            payload = {
                MochilaId: token.MochilaId,
                MochilaCodigo: token.MochilaCodigo,
                tipo: 'iot', // Adiciona um tipo para diferenciar do token de usuário
            };
        }else{
            return res.status(401).json({ error: 'Tipo de token de refresh inválido' });
        }


        // 3. Se o token for válido e não estiver revogado, gera um novo Access Token
        const newAccessToken = jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: '15m' });

        return res.status(200).json({
            ok: true,
            message: 'Access token renovado com sucesso.',
            accessToken: newAccessToken
        });

    } catch (e) {
        // Trata tokens inválidos (ex: assinatura inválida, expirado)
        if (e.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token de refresh expirado. Por favor, faça login novamente.' });
        }

        console.error("Erro ao renovar o token:", e);
        return res.status(401).json({ error: 'Token de refresh inválido.' });

    } finally {
        await prisma.$disconnect();
    }
}
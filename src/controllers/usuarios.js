import { prisma } from "../prisma.js";
import { validarEmail, validarSenha, hashSenha, roundTo2, verificarSenha, diferencaEntreDatas, verificarToken, verificarTokenDoCorpo } from "../utils.js";
import jwt from 'jsonwebtoken';

// Validado (14/09/25) - Criar usuário
export async function criarUsuario(req, res) {
    try {
        const { UsuarioNome, UsuarioEmail, UsuarioSenha, UsuarioDtNascimento, UsuarioPeso, UsuarioAltura, UsuarioSexo, UsuarioFoto, UsuarioPesoMaximoPorcentagem } = req.body;

        if (!UsuarioNome || UsuarioNome.trim() === "") {
            return res.status(409).json({ error: "Nome não pode ser nulo" });
        } else if (UsuarioNome.trim().length < 3 || UsuarioNome.trim().length > 100) {
            return res.status(409).json({ error: "Nome deve ter entre 3 e 100 caracteres" });
        }

        if (!UsuarioEmail || UsuarioEmail.trim() === "") {
            return res.status(409).json({ error: "E-mail não pode ser nulo" });
        } else {
            if (!validarEmail(UsuarioEmail.trim())) {
                return res.status(409).json({ error: "E-mail inválido" });
            }

            const emailExistente = await prisma.usuarios.findUnique({
                where: { UsuarioEmail: UsuarioEmail.trim() }
            });

            if (emailExistente) {
                return res.status(409).json({ error: "E-mail já cadastrado" });
            }

            if (UsuarioEmail.trim().length > 256) {
                return res.status(409).json({ error: "E-mail deve ter no máximo 256 caracteres" });
            }
        }

        const dataNascimento = new Date(UsuarioDtNascimento);
        if (!UsuarioDtNascimento) {
            return res.status(409).json({ error: "Data de Nacimento não pode ser nula" });
        } else {
            const diferencaDatas = diferencaEntreDatas(dataNascimento, new Date(), 'anos', false);
            if (diferencaDatas < 3) {
                return res.status(409).json({ error: "Usuário deve ter pelo menos 3 anos para se usar uma mochila nas costas" });
            }
        }

        if (!UsuarioPeso) {
            return res.status(409).json({ error: "Peso não pode ser nulo" });
        } else if (UsuarioPeso < 9) {
            return res.status(409).json({ error: "Peso mínimo para se carregar uma mochila é de 9kg" });
        }

        if (!UsuarioAltura) {
            return res.status(409).json({ error: "Altura não pode ser nula" });
        } else if (UsuarioAltura < 0.80) {
            return res.status(409).json({ error: "Altura mínima para se carregar uma mochila é de 80cm / 0,80 metros" });
        }

        if (!UsuarioSexo || UsuarioSexo.trim() === "") {
            return res.status(409).json({ error: "Sexo não pode ser nulo" });
        } else if (UsuarioSexo.trim() !== "Masculino" && UsuarioSexo.trim() !== "Feminino" && UsuarioSexo.trim() !== "Outro" && UsuarioSexo.trim() !== "Prefiro não dizer") {
            return res.status(409).json({ error: "Sexo deve ser 'Masculino', 'Feminino', 'Prefiro não dizer' ou 'Outro'" });
        }

        let senhaHash = '';
        if (!UsuarioSenha) {
            return res.status(409).json({ error: "Senha não pode ser nula" });
        } else {
            const resultadoSenha = await validarSenha(UsuarioSenha.trim());

            if (!resultadoSenha.valido) {
                return res.status(409).json({ error: resultadoSenha.erro });
            } else {
                senhaHash = await hashSenha(UsuarioSenha.trim());
            }
        }

        let UsuarioPesoMaximoPorCad;
        if (!UsuarioPesoMaximoPorcentagem) {
            UsuarioPesoMaximoPorCad = 10; // Valor padrão de 10%
        } else {
            UsuarioPesoMaximoPorCad = UsuarioPesoMaximoPorcentagem;
        }

        let usuarioFotoCad;
        if (!UsuarioFoto) {
            usuarioFotoCad = null;
        } else {
            usuarioFotoCad = UsuarioFoto.trim();
        }

        const UsuarioStatus = "Ativo"; // Status padrão

        const usuario = await prisma.usuarios.create({
            data: {
                UsuarioNome: UsuarioNome.trim(),
                UsuarioEmail: UsuarioEmail.trim(),
                UsuarioSenha: senhaHash,
                UsuarioDtNascimento: dataNascimento,
                UsuarioPeso: roundTo2(Number(UsuarioPeso)),
                UsuarioAltura: roundTo2(Number(UsuarioAltura)),
                UsuarioSexo: UsuarioSexo.trim(),
                UsuarioStatus: UsuarioStatus,
                UsuarioFoto: usuarioFotoCad, // Permite foto nula
                UsuarioUltimoAcesso: new Date(), // Define o último acesso como a data atual
                UsuarioDtCadastro: new Date(),
                UsuarioPesoMaximoPorcentagem: UsuarioPesoMaximoPorCad
            }
        });

        //return res.status(201).json(usuario);
        return res.status(201).json({ ok: true, message: 'Usuário criado com sucesso' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Erro ao cadastrar usuário' });
    } finally {
        await prisma.$disconnect();
    }
}

// Validado (14/09/25) - Obter usuário logado
export async function obterUsuarioLogado(req, res) {
    try {

        let dadosUsuario = null;
        if (! await verificarToken(req)) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        } else {
            dadosUsuario = await verificarToken(req);
        }

        const UsuarioIdLogado = Number(dadosUsuario.UsuarioId);

        if(!dadosUsuario.tipo){
        return res.status(403).json({ error: "Token iválido para usuário" });
        }

        if (dadosUsuario.tipo !== 'usuario'){
        return res.status(403).json({ error: "Token iválido para usuário" });
        }

        const usuario = await prisma.usuarios.findUnique({
            where: {
                UsuarioId: UsuarioIdLogado
            },
            select: {
                UsuarioNome: true,
                UsuarioEmail: true,
                UsuarioDtNascimento: true,
                UsuarioPeso: true,
                UsuarioAltura: true,
                UsuarioSexo: true,
                UsuarioFoto: true,
                UsuarioPesoMaximoPorcentagem: true
            }
        });

        if (!usuario) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        //return res.status(200).json({ ok: true, message: 'Usuário encontrado', usuario });
        return res.status(200).json({usuario: usuario, ok: true});

    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Erro ao obter usuário por id' });
    } finally {
        await prisma.$disconnect();
    }
}

// Validado (14/09/25) - Alterar usuário
export async function alterarUsuario(req, res) {
    try {

        let dadosUsuario = null;
        if (! await verificarToken(req)) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        } else {
            dadosUsuario = await verificarToken(req);
        }

        if(!dadosUsuario.tipo){
        return res.status(403).json({ error: "Token iválido para usuário" });
        }

        if (dadosUsuario.tipo !== 'usuario'){
        return res.status(403).json({ error: "Token iválido para usuário" });
        }

        const { UsuarioNome, UsuarioEmail, UsuarioSenha, UsuarioDtNascimento, UsuarioPeso, UsuarioAltura, UsuarioSexo, UsuarioFoto, UsuarioPesoMaximoPorcentagem } = req.body;

        const UsuarioId = Number(dadosUsuario.UsuarioId);

        let usuarioExistente;
        if (!UsuarioId) {
            return res.status(400).json({ error: 'Usuário não autenticado' });
        } else {
            usuarioExistente = await prisma.usuarios.findUnique({
                where: { UsuarioId: UsuarioId, UsuarioStatus: { not: 'Suspenso' } } // Verifica se o usuário está ativo
            });

            if (!usuarioExistente) {
                return res.status(404).json({ error: 'Usuário não encontrado' });
            }
        }

        if (!UsuarioNome || UsuarioNome.trim() === "") {
            return res.status(409).json({ error: "Nome não pode ser nulo" });
        } else if (UsuarioNome.trim().length < 3 || UsuarioNome.trim().length > 100) {
            return res.status(409).json({ error: "Nome deve ter entre 3 e 100 caracteres" });
        }

        if (!UsuarioEmail || UsuarioEmail.trim() === "") {
            return res.status(409).json({ error: "E-mail não pode ser nulo" });
        } else {
            if (!validarEmail(UsuarioEmail)) {
                return res.status(409).json({ error: "E-mail inválido" });
            }

            const emailExistente = await prisma.usuarios.findFirst({
                where: {
                    UsuarioEmail: UsuarioEmail,
                    UsuarioId: { not: UsuarioId } // Verifica se o e-mail já está cadastrado, mas não para o próprio usuário
                }
            });

            if (emailExistente) {
                return res.status(409).json({ error: "E-mail já cadastrado" });
            }
        }

        const dataNascimento = new Date(UsuarioDtNascimento);
        if (!UsuarioDtNascimento) {
            return res.status(409).json({ error: "Data de Nascimento não pode ser nula" });
        } else {
            const diferencaDatas = diferencaEntreDatas(dataNascimento, new Date(), 'anos', false);
            if (diferencaDatas < 3) {
                return res.status(409).json({ error: "Usuário deve ter pelo menos 3 anos para se usar uma mochila nas costas" });
            }
        }

        if (!UsuarioPeso) {
            return res.status(409).json({ error: "Peso não pode ser nulo" });
        } else if (UsuarioPeso < 9) {
            return res.status(409).json({ error: "Peso mínimo para se carregar uma mochila é de 9kg" });
        }

        if (!UsuarioAltura) {
            return res.status(409).json({ error: "Altura não pode ser nula" });
        } else if (UsuarioAltura < 0.80) {
            return res.status(409).json({ error: "Altura mínima para se carregar uma mochila é de 80cm / 0,80 metros" });
        }

        if (!UsuarioSexo || UsuarioSexo.trim() === "") {
            return res.status(409).json({ error: "Sexo não pode ser nulo" });
        } else if (UsuarioSexo.trim() !== "Masculino" && UsuarioSexo.trim() !== "Feminino" && UsuarioSexo.trim() !== "Outro" && UsuarioSexo.trim() !== "Prefiro não dizer") {
            return res.status(409).json({ error: "Sexo deve ser 'Masculino', 'Feminino', 'Prefiro não dizer' ou 'Outro'" });
        }

        let senhaHash = '';
        if (!UsuarioSenha || UsuarioSenha.trim() === ""){
            const senhaExistente = await prisma.usuarios.findFirst({
                where: {
                    UsuarioId: UsuarioId
                },
                select: {
                    UsuarioSenha: true
                }
            });
            senhaHash = senhaExistente.UsuarioSenha;
        } else {
            const resultadoSenha = await validarSenha(UsuarioSenha);

            if (!resultadoSenha.valido) {
                return res.status(409).json({ error: resultadoSenha.erro });
            } else {
                senhaHash = await hashSenha(UsuarioSenha.trim());
            }
        }

        let UsuarioPesoMaximoPorCad;
        if (!UsuarioPesoMaximoPorcentagem) {
            UsuarioPesoMaximoPorCad = 10; // Valor padrão de 10%
        } else {
            UsuarioPesoMaximoPorCad = UsuarioPesoMaximoPorcentagem;
        }

        const UsuarioStatus = "Ativo"; // Status padrão

        let fotoAtualizada;
        if (UsuarioFoto) {
            if (UsuarioFoto.trim() === "deletar") {
                // Se o usuário quiser deletar a foto, define como null
                fotoAtualizada = null;
            } else if (UsuarioFoto.trim() === "null" || UsuarioFoto.trim() === "") {
                fotoAtualizada = usuarioExistente.UsuarioFoto; // Mantém a foto atual se não for especificado
            } else {
                fotoAtualizada = UsuarioFoto.trim(); // Atualiza com a nova foto
            }
        } else {
            fotoAtualizada = usuarioExistente.UsuarioFoto; // Mantém a foto atual se não for especificado
        }

        const usuario = await prisma.usuarios.update({
            where: {
                UsuarioId: UsuarioId
            },
            data: {
                UsuarioNome: UsuarioNome.trim(),
                UsuarioEmail: UsuarioEmail.trim(),
                UsuarioSenha: senhaHash,
                UsuarioDtNascimento: dataNascimento,
                UsuarioPeso: roundTo2(Number(UsuarioPeso)),
                UsuarioAltura: roundTo2(Number(UsuarioAltura)),
                UsuarioSexo: UsuarioSexo.trim(),
                UsuarioStatus: UsuarioStatus,
                UsuarioFoto: fotoAtualizada, // Permite foto nula
                UsuarioPesoMaximoPorcentagem: UsuarioPesoMaximoPorCad
            }
        });

        return res.status(200).json({ ok: true, message: 'Usuário atualizado com sucesso' });
        //return res.status(200).json(usuario);

    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Erro ao alterar usuário' });
    } finally {
        await prisma.$disconnect();
    }
}

// Validado (14/09/25) - Login
export async function login(req, res) {
    try {
        const { UsuarioEmail, UsuarioSenha, TipoLogin } = req.body;

        if (!UsuarioEmail) {
            return res.status(400).json({ error: 'E-mail é obrigatório' });
        }

        if (!UsuarioSenha) {
            return res.status(400).json({ error: 'Senha é obrigatória' });
        }

        if (!TipoLogin) {
            return res.status(400).json({ error: 'Informe de onde vem a requisição (App ou Web)' });
        }else if (TipoLogin !== 'App' && TipoLogin !== 'Web') {
            return res.status(400).json({ error: 'Tipo de login inválido. Use "App" ou "Web"' });
        }

        const usuario = await prisma.usuarios.findUnique({
            where: {
                UsuarioEmail: UsuarioEmail
            }
        });

        if (!usuario) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        if (usuario.UsuarioStatus === 'Suspenso') {
            return res.status(403).json({ error: 'Usuário suspenso. Contate o suporte.' });
        }

        const senhaValida = await verificarSenha(UsuarioSenha, usuario.UsuarioSenha);
        if (!senhaValida) {
            return res.status(401).json({ error: 'Senha incorreta' });
        }

        await prisma.usuarios.update({
            where: { UsuarioId: usuario.UsuarioId },
            data: { UsuarioUltimoAcesso: new Date() }
        });

        // Cria a sessão do usuário
        //await criaSessao(req, usuario.UsuarioId, usuario.UsuarioEmail);

        let payload = {
            UsuarioId: usuario.UsuarioId,
            UsuarioEmail: usuario.UsuarioEmail,
            tipo: 'usuario' // Adiciona um tipo para diferenciar do token de IoT
        };

        // 1. Gerar o token de acesso (curta duração)
        const accessToken = jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: '15m' });

        payload = {
            UsuarioId: usuario.UsuarioId,
            UsuarioEmail: usuario.UsuarioEmail,
            tipo: 'usuario', // Adiciona um tipo para diferenciar do token de IoT
            nivel: 'refresh' // Indica que este é um token de refresh
        };

        // 2. Gerar o token de refresh (longa duração)
        let refreshToken;
        if (TipoLogin === 'App') {
            refreshToken = jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: '60d' });
        } else if (TipoLogin === 'Web') {
            refreshToken = jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: '1d' });
        }

        // 3. Retornar ambos os tokens para o cliente
        return res.status(200).json({
            ok: true,
            message: 'Login realizado com sucesso.',
            accessToken: accessToken,
            refreshToken: refreshToken
        });

    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Erro ao realizar login' });
    } finally {
        await prisma.$disconnect();
    }
}

// Validado (20/09/25) - Logout
// Esta rota recebe um Refresh Token e o adiciona à blacklist
// para que ele não possa mais ser usado, mesmo que não tenha expirado.
export async function logout(req, res) {
    try {

        const refreshToken = verificarTokenDoCorpo(req);

        if (!refreshToken) {
            return res.status(400).json({ error: 'Token de refresh não fornecido.' });
        }

        // Tenta adicionar o token à tabela de tokens revogados
        await prisma.tokensRevogados.create({
            data: {
                token: refreshToken
            }
        });

        // O token foi revogado com sucesso.
        return res.status(200).json({ ok: true, message: 'Sessão encerrada com sucesso.' });

    } catch (e) {
        // Se o token já estiver na tabela, o Prisma lançará um erro de violação de chave primária.
        // Neste caso, tratamos como sucesso, pois o token já estava revogado.
        if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
            return res.status(200).json({ ok: true, message: 'Sessão já estava encerrada.' });
        }

        console.error("Erro ao revogar o token:", e);
        return res.status(500).json({ error: 'Erro interno do servidor.' });

    } finally {
        await prisma.$disconnect();
    }
}

// Validado (14/09/25) - Excluir usuário
export async function excluirUsuario(req, res) {
    try {

        let usuario = null;
        if (! await verificarToken(req)) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        } else {
            usuario = await verificarToken(req);
        }

        const UsuarioId = Number(usuario.UsuarioId);

        if(!usuario.tipo){
        return res.status(403).json({ error: "Token iválido para usuário" });
        }

        if (usuario.tipo !== 'usuario'){
        return res.status(403).json({ error: "Token iválido para usuário" });
        }

        if (!UsuarioId) {
            return res.status(400).json({ error: 'Usuário não autenticado' });
        }

        const usuarioExistente = await prisma.usuarios.findUnique({
            where: { UsuarioId: UsuarioId } // Verifica se o usuário não está excluído
        });

        if (!usuarioExistente) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        const UsuarioSenha = req.body.UsuarioSenha;
        if (!UsuarioSenha || UsuarioSenha.trim() === "") {
            return res.status(400).json({ error: 'Senha é obrigatória para exclusão' });
        } else {
            if (!await verificarSenha(UsuarioSenha.trim(), usuarioExistente.UsuarioSenha)) {
                return res.status(401).json({ error: 'Senha incorreta' });
            }
        }

        // Atualiza o status do usuário para "Excluido"
        await prisma.usuarios.delete({
            where: { UsuarioId: UsuarioId }
        });

        return res.status(200).json({ ok: true, message: 'Usuário excluído com sucesso' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Erro ao excluir usuário' });
    } finally {
        await prisma.$disconnect();
    }
}

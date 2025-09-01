import { prisma } from "../prisma.js";
import { validarEmail, validarSenha, hashSenha, roundTo2, validarSessao, criaSessao, destruirSessao, verificarSenha, diferencaEntreDatas } from "../utils.js";

// Para testes
export async function criptografarSenha(req, res) {
    try {
        const senha = req.params.senha;
        const senhaHash = await hashSenha(senha);
        return res.status(200).json({ senha: senha, hash: senhaHash });
    } catch (e) {   
        console.error(e);
        return res.status(500).json({ error: 'Erro ao criptografar senha' });
    }
}

// Validado (26/08)
export async function criarUsuario(req, res) {
    try{
        const { UsuarioNome, UsuarioEmail, UsuarioSenha, UsuarioDtNascimento,  UsuarioPeso, UsuarioAltura, UsuarioSexo, UsuarioFoto, UsuarioPesoMaximoPorcentagem } = req.body;

        if (!UsuarioNome || UsuarioNome.trim() === "") {
            return res.status(409).json({ error: "Nome não pode ser nulo" });
        }else if (UsuarioNome.trim().length < 3 || UsuarioNome.trim().length > 100) {
            return res.status(409).json({ error: "Nome deve ter entre 3 e 100 caracteres" });
        }

        if (!UsuarioEmail || UsuarioEmail.trim() === "") {
            return res.status(409).json({ error: "E-mail não pode ser nulo" });
        }else{
            if (!validarEmail(UsuarioEmail.trim())){
                return res.status(409).json({ error: "E-mail inválido" });
            }

            const emailExistente = await prisma.usuarios.findUnique({
                where: { UsuarioEmail: UsuarioEmail.trim() }
            });

            if (emailExistente){
                return res.status(409).json({ error: "E-mail já cadastrado" });
            }

            if (UsuarioEmail.trim().length > 256) {
                return res.status(409).json({ error: "E-mail deve ter no máximo 256 caracteres" });
            }
        }

        const dataNascimento = new Date(UsuarioDtNascimento);
        if (!UsuarioDtNascimento){
            return res.status(409).json({ error: "Data de Nacimento não pode ser nula" });
        }else{
            const diferencaDatas = diferencaEntreDatas(dataNascimento, new Date(), 'anos', false);
            if (diferencaDatas < 3) {
                return res.status(409).json({ error: "Usuário deve ter pelo menos 3 anos para se usar uma mochila nas costas" });
            }
        }

        if (!UsuarioPeso){
            return res.status(409).json({ error: "Peso não pode ser nulo" });
        }else if (UsuarioPeso < 9){
            return res.status(409).json({ error: "Peso mínimo para se carregar uma mochila é de 9kg" });
        }

        if (!UsuarioAltura){
            return res.status(409).json({ error: "Altura não pode ser nula" });
        }else if (UsuarioAltura < 0.80){
            return res.status(409).json({ error: "Altura mínima para se carregar uma mochila é de 80cm / 0,80 metros" });
        }

        if (!UsuarioSexo || UsuarioSexo.trim() === "") {
            return res.status(409).json({ error: "Sexo não pode ser nulo" });
        }else if (UsuarioSexo.trim() !== "Masculino" && UsuarioSexo.trim() !== "Feminino" && UsuarioSexo.trim() !== "Outro" && UsuarioSexo.trim() !== "Prefiro não dizer") {
            return res.status(409).json({ error: "Sexo deve ser 'Masculino', 'Feminino', 'Prefiro não dizer' ou 'Outro'" });
        }

        let senhaHash = '';
        if (!UsuarioSenha){
            return res.status(409).json({ error: "Senha não pode ser nula" });
        }else{
            const resultadoSenha = await validarSenha(UsuarioSenha.trim());

            if (!resultadoSenha.valido){
                return res.status(409).json({ error: resultadoSenha.erro });
            }else{
                senhaHash = await hashSenha(UsuarioSenha.trim());
            }
        }

        let UsuarioPesoMaximoPorCad;
        if (!UsuarioPesoMaximoPorcentagem){
            UsuarioPesoMaximoPorCad = 10; // Valor padrão de 10%
        }else{
            UsuarioPesoMaximoPorCad = UsuarioPesoMaximoPorcentagem;
        }

        let usuarioFotoCad;
        if (!UsuarioFoto){
            usuarioFotoCad = null;
        }else{
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

        return res.status(201).json(usuario);
        //return res.status(201).json({ ok: true, message: 'Usuário criado com sucesso'});
    }catch(e){
        console.error(e);
        return res.status(500).json({ error: 'Erro ao cadastrar usuário' });
    }
}

// Validado (26/08)
export async function obterUsuarioEmail(req, res) {
    try{

        if (!validarSessao(req)) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        const UsuarioEmail = req.params.email;

        if (!UsuarioEmail) {
            return res.status(400).json({ error: 'E-mail é obrigatório' });
        }

        const usuario = await prisma.usuarios.findUnique({
            where: { 
                UsuarioEmail: UsuarioEmail,
                UsuarioId: Number(req.session.usuario.id)
            }
        });

        if (!usuario) {
            return res.status(404).json({ error: 'Usuário não encontrado ou não autorizado a obter os seus dados' });
        }

        return res.status(200).json(usuario);
    }catch(e){
        console.error(e);
        return res.status(500).json({ error: 'Erro ao obter usuário por e-mail' });
    }
}

// Validado (26/08)
export async function obterUsuarioId(req, res) {
    try{

        if (!validarSessao(req)) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        const UsuarioId = Number(req.params.id);

        if (!UsuarioId) {
            return res.status(400).json({ error: 'Id é obrigatório' });
        }

        const usuario = await prisma.usuarios.findFirst({
            where: { 
                AND: [
                    { UsuarioId: UsuarioId },
                    { UsuarioId: Number(req.session.usuario.id) } // Verifica se o usuário está autenticado
                ]
            }
        });
        if (!usuario) {
            return res.status(404).json({ error: 'Usuário não encontrado ou não autorizado a obter os seus dados' });
        }

        //return res.status(200).json({ ok: true, message: 'Usuário encontrado', usuario });
        return res.status(200).json(usuario);

    }catch(e){
        console.error(e);
        return res.status(500).json({ error: 'Erro ao obter usuário por id' });
    }
}

// Apenas para testes (deve ser removido ou protegido em produção) - Validado (26/08)
export async function obterUsuarios(req, res) {
    try {
        const usuarios = await prisma.usuarios.findMany();
        return res.json(usuarios);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro ao obter usuários" });
    }
}

// Implementar depois armazenagem da foto - Validado (26/08)
export async function alterarUsuario(req, res) {
    try{

        if (!validarSessao(req)) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        const { UsuarioNome, UsuarioEmail, UsuarioSenha, UsuarioDtNascimento,  UsuarioPeso, UsuarioAltura, UsuarioSexo, UsuarioFoto, UsuarioPesoMaximoPorcentagem } = req.body;

        const UsuarioId =  Number(req.session.usuario.id);

        let usuarioExistente;
        if (!UsuarioId) {
            return res.status(400).json({ error: 'Usuário não autenticado' });
        }else{
            usuarioExistente = await prisma.usuarios.findUnique({
                where: { UsuarioId: UsuarioId, UsuarioStatus: { not: 'Excluido', not: 'Suspenso'  } } // Verifica se o usuário está ativo
            });

            if (!usuarioExistente) {
                return res.status(404).json({ error: 'Usuário não encontrado' });
            }
        }

        if (!UsuarioNome || UsuarioNome.trim() === "") {
            return res.status(409).json({ error: "Nome não pode ser nulo" });
        }else if (UsuarioNome.trim().length < 3 || UsuarioNome.trim().length > 100) {
            return res.status(409).json({ error: "Nome deve ter entre 3 e 100 caracteres" });
        }

        if (!UsuarioEmail || UsuarioEmail.trim() === "") {
            return res.status(409).json({ error: "E-mail não pode ser nulo" });
        }else{
            if (!validarEmail(UsuarioEmail)){
                return res.status(409).json({ error: "E-mail inválido" });
            }

            const emailExistente = await prisma.usuarios.findFirst({
                where: { 
                    UsuarioEmail: UsuarioEmail,
                    UsuarioId: { not: UsuarioId } // Verifica se o e-mail já está cadastrado, mas não para o próprio usuário
                }
            });

            if (emailExistente){
                return res.status(409).json({ error: "E-mail já cadastrado" });
            }
        }

        const dataNascimento = new Date(UsuarioDtNascimento);
        if (!UsuarioDtNascimento){
            return res.status(409).json({ error: "Data de Nascimento não pode ser nula" });
        }else{
            const diferencaDatas = diferencaEntreDatas(dataNascimento, new Date(), 'anos', false);
            if (diferencaDatas < 3) {
                return res.status(409).json({ error: "Usuário deve ter pelo menos 3 anos para se usar uma mochila nas costas" });
            }
        }

        if (!UsuarioPeso){
            return res.status(409).json({ error: "Peso não pode ser nulo" });
        }else if (UsuarioPeso < 9){
            return res.status(409).json({ error: "Peso mínimo para se carregar uma mochila é de 9kg" });
        }

        if (!UsuarioAltura){
            return res.status(409).json({ error: "Altura não pode ser nula" });
        }else if (UsuarioAltura < 0.80){
            return res.status(409).json({ error: "Altura mínima para se carregar uma mochila é de 80cm / 0,80 metros" });
        }

        if (!UsuarioSexo || UsuarioSexo.trim() === "") {
            return res.status(409).json({ error: "Sexo não pode ser nulo" });
        }else if (UsuarioSexo.trim() !== "Masculino" && UsuarioSexo.trim() !== "Feminino" && UsuarioSexo.trim() !== "Outro" && UsuarioSexo.trim() !== "Prefiro não dizer") {
            return res.status(409).json({ error: "Sexo deve ser 'Masculino', 'Feminino', 'Prefiro não dizer' ou 'Outro'" });
        }

        let senhaHash = '';
        if (!UsuarioSenha){
            return res.status(409).json({ error: "Senha não pode ser nula" });
        }else{
            const resultadoSenha = await validarSenha(UsuarioSenha);

            if (!resultadoSenha.valido){
                return res.status(409).json({ error: resultadoSenha.erro });
            }else{
                senhaHash = await hashSenha(UsuarioSenha.trim());
            }
        }

        let UsuarioPesoMaximoPorCad;
        if (!UsuarioPesoMaximoPorcentagem){
            UsuarioPesoMaximoPorCad = 10; // Valor padrão de 10%
        }else{
            UsuarioPesoMaximoPorCad = UsuarioPesoMaximoPorcentagem;
        }

        const UsuarioStatus = "Ativo"; // Status padrão

        let fotoAtualizada;
        if (UsuarioFoto){
            if (UsuarioFoto.trim() === "deletar") {
                // Se o usuário quiser deletar a foto, define como null
                fotoAtualizada = null;
            }else if (UsuarioFoto.trim() === "null" || UsuarioFoto.trim() === "") {
                fotoAtualizada = usuarioExistente.UsuarioFoto; // Mantém a foto atual se não for especificado
            }else{
                fotoAtualizada = UsuarioFoto.trim(); // Atualiza com a nova foto
            }
        }else{
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

        //return res.status(200).json({ ok: true, message: 'Usuário atualizado com sucesso' });
        return res.status(200).json(usuario);

    }catch(e){
        console.error(e);
        return res.status(500).json({ error: 'Erro ao alterar usuário' });
    }
}

// Validado (27/08)
export async function login(req, res) {
    try {
        const { UsuarioEmail, UsuarioSenha } = req.body;

        if (!UsuarioEmail) {
            return res.status(400).json({ error: 'E-mail é obrigatório' });
        }

        if (!UsuarioSenha) {
            return res.status(400).json({ error: 'Senha é obrigatória' });
        }

        const usuario = await prisma.usuarios.findUnique({
            where: { 
                UsuarioEmail: UsuarioEmail
            }
        });

        if (!usuario) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        if (usuario.UsuarioStatus === 'Excluido') {
            return res.status(403).json({ error: 'Usuário não encontrado' });
        }else if (usuario.UsuarioStatus === 'Suspenso') {
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
        await criaSessao(req, usuario.UsuarioId, usuario.UsuarioEmail);
        
        return res.status(200).json({ ok: true, message: 'Login realizado com sucesso', usuarioId: usuario.UsuarioId });

    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Erro ao realizar login' });
    }
}

// Validado (26/08)
export async function logout(req, res) {
    try {
        if (!validarSessao(req)) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }
        if (!destruirSessao(req)) {
            return res.status(500).json({ error: 'Erro ao encerrar sessão (função)' });
        }
        return res.status(200).json({ ok: true, message: 'Sessão encerrada com sucesso' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Erro ao encerrar sessão' });
    }
}

// Validado (27/08)
export async function excluirUsuario(req, res) {
    try {

        if (!validarSessao(req)) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        const UsuarioId = req.session.usuario.id;  
        if (!UsuarioId) {
            return res.status(400).json({ error: 'Usuário não autenticado' });
        }

        const usuarioExistente = await prisma.usuarios.findUnique({
            where: { UsuarioId: UsuarioId, NOT: { UsuarioStatus: 'Excluido' } } // Verifica se o usuário não está excluído
        });

        if (!usuarioExistente) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        const UsuarioSenha = req.body.UsuarioSenha;
        if (!UsuarioSenha || UsuarioSenha.trim() === "") {
            return res.status(400).json({ error: 'Senha é obrigatória para exclusão' });
        }else{
            if (!await verificarSenha(UsuarioSenha.trim(), usuarioExistente.UsuarioSenha)) {
                return res.status(401).json({ error: 'Senha incorreta' });
            }
        }

        // Atualiza o status do usuário para "Excluido"
        await prisma.usuarios.update({
            where: { UsuarioId: UsuarioId },
            data: { UsuarioStatus: "Excluido" }
        });

        // Destrói a sessão do usuário
        if (!destruirSessao(req)) {
            return res.status(500).json({ error: 'Erro ao encerrar sessão (função)' });
        }

        return res.status(200).json({ ok: true, message: 'Usuário excluído com sucesso'});
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Erro ao excluir usuário' });
    }
}
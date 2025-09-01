import { prisma } from "../prisma.js";
//import bcrypt from "bcrypt";
import { hashSenha, roundTo2, verificarSenha } from "../utils.js";
import { customAlphabet } from 'nanoid';

// Validado (28/08)
export async function criarMochila(req, res) {
    try{
        const { MochilaPesoMax, password, passwordAdmin, AdminEmail, MochilaDescricao } = req.body;

        let admin;
        if (!password || password.trim() === "" || !passwordAdmin || passwordAdmin.trim() === "" || !AdminEmail || AdminEmail.trim() === "") {
            return res.status(403).json({ error: "Senhas e e-mail obrigatórios para criação" });
        }else{
            admin = await prisma.admins.findUnique({
                where: { AdminEmail: AdminEmail.trim() }
            });

            if (!admin) {
                return res.status(404).json({ error: "Administrador não encontrado" });
            }

            if (! await verificarSenha(password, process.env.PASSWORD_ADD_MOCHILA) || ! await verificarSenha(passwordAdmin, admin.AdminSenha)) {
                return res.status(403).json({ error: "Senha incorreta" });
            }
        }

        if (!MochilaPesoMax || isNaN(MochilaPesoMax) || (MochilaPesoMax < 0.1 || MochilaPesoMax > 50)) {
            return res.status(400).json({ error: "Peso máximo da mochila é obrigatório e deve ser de 0,1 à 50 kg" });
        }

        if (!MochilaDescricao || MochilaDescricao.trim() === "") {
            return res.status(400).json({ error: "Descrição da mochila é obrigatória" });
        }


        const gerarCodigoMochila = customAlphabet('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', 12);

        const MochilaCodigo = gerarCodigoMochila().trim(); // Gera um código aleatório de 8 caracteres

        const mochilaExistente = await prisma.mochilas.findUnique({
            where: { MochilaCodigo }
        });

        if (mochilaExistente) {
            return res.status(409).json({ error: "Mochila já cadastrada, código já usado,tete novamente" });
        }

        const MochilaSenha = gerarCodigoMochila().trim(); // Gera um código aleatório de 8 caracteres para a senha da mochila

        const MochilaSenhaHash = await hashSenha(MochilaSenha);

        const MochilaDtCadastro = new Date();
        const MochilaStatus = "Ativo";

        await prisma.mochilas.create({
            data: {
                MochilaCodigo: MochilaCodigo.trim(),
                MochilaPesoMax: roundTo2(MochilaPesoMax),
                MochilaDtCadastro: MochilaDtCadastro,
                MochilaDtAlteracao: MochilaDtCadastro,
                MochilaStatus: MochilaStatus,
                AdminId: admin.AdminId,
                MochilaDescricao: MochilaDescricao,
                MochilaSenha: MochilaSenhaHash
            }
        });

        const mochilaCadastrada = {
            MochilaCodigo: MochilaCodigo.trim(),
            MochilaPesoMax: roundTo2(MochilaPesoMax),
            MochilaDtCadastro: MochilaDtCadastro,
            MochilaDtAlteracao: MochilaDtCadastro,
            MochilaStatus: MochilaStatus,
            AdminId: admin.AdminId,
            MochilaDescricao: MochilaDescricao,
            MochilaSenha: MochilaSenha
        }

        //return res.status(201).json({ ok: true, message: 'Mochila criada com sucesso'})
        return res.status(201).json({ mochilaCadastrada, ok: true, message: "Mochila cadastrada com sucesso" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro ao criar mochila" });
    }
}

// Validado (28/08), desativar depois, somente para testes
export async function obterMochilas(req, res) {
    try {
        const mochilas = await prisma.mochilas.findMany(
            {
                orderBy: { MochilaDtCadastro: 'desc' }
            }
        );
        return res.json(mochilas);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro ao obter mochilas" });
    }
}

// Validado (28/08)
export async function obterMochilaCodigo(req, res) {
    try {
        const MochilaCodigo = req.params.codigo;

        if (!MochilaCodigo || MochilaCodigo.trim() === "") {
            return res.status(400).json({ error: "Codigo da mochila é obrigatório" });
        }

        const mochila = await prisma.mochilas.findFirst({ where: { MochilaCodigo: MochilaCodigo.trim(), MochilaStatus: "Ativo" },
        select: { MochilaCodigo: true, MochilaPesoMax: true, MochilaDtCadastro: true, MochilaStatus: true, MochilaDescricao: true
        } 
        });

        if (!mochila) {
            return res.status(404).json({ error: "Mochila não encontrada" });
        }

        return res.json(mochila);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro ao obter mochilas" });
    }
}

// Validado (28/08)
export async function obterMochilaId(req, res) {
    try {
        const MochilaId = parseInt(req.params.id);

        if (!MochilaId || isNaN(MochilaId)) {
            return res.status(400).json({ error: "ID da mochila inválido" });
        }

        const mochila = await prisma.mochilas.findFirst({ where: { MochilaCodigo: MochilaCodigo.trim(), MochilaStatus: "Ativo" },
        select: { MochilaId: true, MochilaPesoMax: true, MochilaDtCadastro: true, MochilaStatus: true, MochilaDescricao: true
        } 
        });

        if (!mochila) {
            return res.status(404).json({ error: "Mochila não encontrada" });
        }

        return res.json(mochila);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro ao obter mochilas" });
    }
}

// Validado (30/08)
export async function alterarMochila(req, res) {
    try {

        const { password, passwordAdmin, AdminEmail } = req.body;

        let admin;
        if (!password || password.trim() === "" || !passwordAdmin || passwordAdmin.trim() === "" || !AdminEmail || AdminEmail.trim() === "") {
            return res.status(403).json({ error: "Senhas e e-mail obrigatórios para alteração" });
        }else{
            admin = await prisma.admins.findUnique({
                where: { AdminEmail: AdminEmail.trim() }
            });

            if (!admin) {
                return res.status(404).json({ error: "Administrador não encontrado" });
            }

            if (! await verificarSenha(password, process.env.PASSWORD_UPDATE_MOCHILA) || ! await verificarSenha(passwordAdmin, admin.AdminSenha)) {
                return res.status(403).json({ error: "Senha incorreta" });
            }
        }

        const MochilaId  = parseInt(req.body.MochilaId);

        const MochilaCodigo  = req.body.MochilaCodigo;

        if (!MochilaId || isNaN(MochilaId)) {
            return res.status(400).json({ error: "ID da mochila é obrigatório"});
        }

        if (!MochilaCodigo || MochilaCodigo.trim() === ''){
            return res.status(400).json({ error: "Código da mochila é inválido" });
        }

        const mochila = await prisma.mochilas.findFirst({ 
            where: { 
                MochilaId: MochilaId, 
                MochilaCodigo: 
                MochilaCodigo, 
                MochilaStatus: "Ativo" 
            } 
        });

        if (!mochila) {
            return res.status(404).json({ error: "Mochila não encontrada ou já excluída" });
        }

        const AlterarSenha = req.body.AlterarSenha;
        let MochilaSenha = '';
        let MochilaSenhaHash;
        let mochilaAlterada;

        if (AlterarSenha === 'Sim' || AlterarSenha === 'Somente'){
            const gerarCodigoMochila = customAlphabet('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', 12);

            MochilaSenha = gerarCodigoMochila().trim(); // Gera um código aleatório de 8 caracteres para a senha da mochila

            MochilaSenhaHash = await hashSenha(MochilaSenha);
        }

        if (AlterarSenha === 'Somente'){
            const MochilaDtAlteracao = new Date();

            // Atualiza o status da mochila
            await prisma.mochilas.update({
                where: { 
                    MochilaId: MochilaId, 
                    MochilaStatus: "Ativo" 
                },
                data: { 
                    MochilaDtAlteracao: MochilaDtAlteracao, 
                    MochilaSenha: MochilaSenhaHash 
                }
            });

            return res.json({ ok: true, message: "Senha da mochila alterada com sucesso", MochilaSenha: MochilaSenha });

        }else{
            const { MochilaPesoMax, MochilaDescricao } = req.body;

            if (!MochilaPesoMax || isNaN(MochilaPesoMax)){
                return res.status(400).json({ error: "Peso máximo deve ser um número" })
            }

            if (!MochilaPesoMax || isNaN(MochilaPesoMax) || (MochilaPesoMax < 0.1 || MochilaPesoMax > 50)) {
                return res.status(400).json({ error: "Peso máximo da mochila é obrigatório e deve ser de 0,1 à 50 kg" });
            }

            if (!MochilaDescricao || MochilaDescricao.trim() === ''){
                return res.status(400).json({ error: "Descrição é obrigatoria" })
            }

            const mochila = await prisma.mochilas.findFirst({ 
                where: { MochilaId: MochilaId, 
                    MochilaCodigo: MochilaCodigo, 
                    MochilaStatus: "Ativo" 
                } 
            });

            if (!mochila) {
                return res.status(404).json({ error: "Mochila não encontrada ou já excluída" });
            }else{
                const { password, passwordAdmin, AdminEmail } = req.body;
                if (!password || password.trim() === "" || !passwordAdmin || passwordAdmin.trim() === "" || !AdminEmail || AdminEmail.trim() === "") {
                    return res.status(403).json({ error: "Senhas e e-mail obrigatórios para exclusão" });
                }else{
                    const admin = await prisma.admins.findUnique({
                        where: { 
                            AdminEmail: AdminEmail.trim() 
                        }
                    });

                    if (!admin) {
                        return res.status(404).json({ error: "Administrador não encontrado" });
                    }

                    if (! await verificarSenha(password, process.env.PASSWORD_UPDATE_MOCHILA) || ! await verificarSenha(passwordAdmin, admin.AdminSenha)) {
                        return res.status(403).json({ error: "Senha incorreta" });
                    }
                }
            }

            const MochilaDtAlteracao = new Date();

            if (AlterarSenha === 'Sim'){
                // Atualiza os dados da mochila
                await prisma.mochilas.update({
                    where: { 
                        MochilaId: MochilaId, 
                        MochilaStatus: "Ativo" 
                    },
                    data: { MochilaDescricao: MochilaDescricao, 
                        MochilaPesoMax: roundTo2(MochilaPesoMax), 
                        MochilaDtAlteracao: MochilaDtAlteracao, 
                        AdminId: admin.AdminId, 
                        MochilaSenha: MochilaSenhaHash 
                    }
                });

                mochilaAlterada = {
                    MochilaDescricao: MochilaDescricao, 
                    MochilaPesoMax: roundTo2(MochilaPesoMax), 
                    MochilaDtAlteracao: MochilaDtAlteracao,
                    MochilaSenha: MochilaSenha
                };
            }else{
                // Atualiza os dados da mochila
                await prisma.mochilas.update({
                    where: { 
                        MochilaId: MochilaId, 
                        MochilaStatus: "Ativo" 
                    },
                    data: { 
                        MochilaDescricao: MochilaDescricao, 
                        MochilaPesoMax: roundTo2(MochilaPesoMax), 
                        MochilaDtAlteracao: MochilaDtAlteracao 
                    }
                });

                mochilaAlterada = {
                    MochilaDescricao: MochilaDescricao, 
                    MochilaPesoMax: roundTo2(MochilaPesoMax), 
                    MochilaDtAlteracao: MochilaDtAlteracao
                };
            }

            return res.json({ ok: true, message: "Mochila alterada com sucesso", mochilaAlterada });
        }

        
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro ao alterar mochila" });
    }
}

// Validado (28/08)
export async function excluirMochila(req, res) {
    try {

        const { password, passwordAdmin, AdminEmail } = req.body;

        let admin;
        if (!password || password.trim() === "" || !passwordAdmin || passwordAdmin.trim() === "" || !AdminEmail || AdminEmail.trim() === "") {
            return res.status(403).json({ error: "Senhas e e-mail obrigatórios para exclusão" });
        }else{
            admin = await prisma.admins.findUnique({
                where: { AdminEmail: AdminEmail.trim() }
            });

            if (!admin) {
                return res.status(404).json({ error: "Administrador não encontrado" });
            }

            if (! await verificarSenha(password, process.env.PASSWORD_DELETE_MOCHILA) || ! await verificarSenha(passwordAdmin, admin.AdminSenha)) {
                return res.status(403).json({ error: "Senha incorreta" });
            }
        }

        const MochilaId  = parseInt(req.body.MochilaId);

        const MochilaCodigo  = req.body.MochilaCodigo;

        if (!MochilaId || isNaN(MochilaId)) {
            return res.status(400).json({ error: "ID da mochila é obrigatório"});
        }

        if (!MochilaCodigo || MochilaCodigo.trim() === ''){
            return res.status(400).json({ error: "Código da mochila é inválido" });
        }

        const mochila = await prisma.mochilas.findFirst({ where: { MochilaId: MochilaId, MochilaCodigo: MochilaCodigo, MochilaStatus: "Ativo" } });

        if (!mochila) {
            return res.status(404).json({ error: "Mochila não encontrada ou já excluída" });
        }else{
            const { password, passwordAdmin, AdminEmail } = req.body;
            if (!password || password.trim() === "" || !passwordAdmin || passwordAdmin.trim() === "" || !AdminEmail || AdminEmail.trim() === "") {
                return res.status(403).json({ error: "Senhas e e-mail obrigatórios para exclusão" });
            }else{
                const admin = await prisma.admins.findUnique({
                    where: { AdminEmail: AdminEmail.trim() }
                });

                if (!admin) {
                    return res.status(404).json({ error: "Administrador não encontrado" });
                }

                if (! await verificarSenha(password, process.env.PASSWORD_DELETE_MOCHILA) || ! await verificarSenha(passwordAdmin, admin.AdminSenha)) {
                    return res.status(403).json({ error: "Senha incorreta" });
                }
            }
        }

        const MochilaDtAlteracao = new Date();

        // Atualiza o status da mochila
        await prisma.mochilas.update({
            where: { MochilaId: MochilaId, MochilaStatus: "Ativo" },
            data: { MochilaStatus: "Inativo", AdminId: admin.AdminId, MochilaDtAlteracao: MochilaDtAlteracao }
        });

        return res.json({ ok: true, message: "Mochila excluída com sucesso" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro ao excluir mochila" });
    }
}
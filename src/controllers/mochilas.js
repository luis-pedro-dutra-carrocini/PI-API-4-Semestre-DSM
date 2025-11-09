import { prisma } from "../prisma.js";
import { hashSenha, roundTo2, verificarSenha, verificarAssinatura } from "../utils.js";
import { customAlphabet } from 'nanoid';
import jwt from 'jsonwebtoken';

// Validado (28/08), desativar depois, somente para testes
/*
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
*/

// Validado (28/08) - Desativado (Obter somente por código)
/*
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
*/

// Validado (15/09) - Login Mochila (IoT) com assinatura digital
// A função de verificação da assinatura usará a chave pública.
// Vamos supor que você tenha uma função para isso, por exemplo, 'verificarAssinatura'.
// Ela precisaria da assinatura, do código da mochila (para buscar a chave pública)
// e dos dados que foram assinados (como um timestamp, para evitar ataques de repetição).
export async function loginMochila(req, res) {
    try {
        const { MochilaCodigo, assinatura, timestamp } = req.body;

        if (!MochilaCodigo || !assinatura || !timestamp) {
            return res.status(400).json({ error: 'Código da mochila, assinatura e timestamp são obrigatórios.' });
        }

        const mochila = await prisma.mochilas.findFirst({
            where: {
                MochilaCodigo: MochilaCodigo,
                MochilaStatus: 'Ativo'
            },
            select: {
                MochilaId: true,
                MochilaCodigo: true,
                MochilaChavePublica: true
            }
        });

        if (!mochila) {
            return res.status(401).json({ ok: false, message: 'Mochila não encontrada ou inativa.' });
        }

        // Dados que serão verificados, com as chaves ordenadas
        const dadosAssinados = { MochilaCodigo, timestamp };

        const assinaturaValida = verificarAssinatura(assinatura, dadosAssinados, mochila.MochilaChavePublica);

        if (!assinaturaValida) {
            return res.status(401).json({ ok: false, message: 'Assinatura inválida. Autenticação falhou.' });
        }

        let payload = {
            MochilaId: mochila.MochilaId,
            MochilaCodigo: mochila.MochilaCodigo,
            tipo: 'iot',
        };

        const accessToken = jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: '15m' });

        payload = {
            MochilaId: mochila.MochilaId,
            MochilaCodigo: mochila.MochilaCodigo,
            tipo: 'iot',
            nivel: 'refresh'
        };

        const refreshToken = jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: '1d' });

        return res.status(200).json({
            ok: true,
            message: 'Autenticação da mochila realizada com sucesso.',
            accessToken: accessToken,
            refreshToken: refreshToken
        });
    } catch (e) {
        console.error("Erro ao autenticar a mochila:", e);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
}

//Antigo
/*
// Validado (15/09) - Login Mochila (IoT)
export async function loginMochila(req, res) {
    try {

        const { MochilaCodigo, MochilaSenha } = req.body;

        if (!MochilaCodigo) {
            return res.status(400).json({ error: 'Código da mochila é obrigatório.' });
        }

        if (!MochilaSenha) {
            return res.status(400).json({ error: 'Senha da mochila é obrigatória.' });
        }

        // 1. Busca a mochila no banco de dados usando o código.
        const mochila = await prisma.mochilas.findUnique({
            where: {
                MochilaCodigo: MochilaCodigo,
                MochilaStatus: 'Ativo'
            },
        });

        if (!mochila || ! await verificarSenha(MochilaSenha, mochila.MochilaSenha)) {
            return res.status(401).json({ ok: false, message: 'Mochila não encontrada ou senha inválida.' });
        }

        // 2. Prepara o payload (dados) para o token.
        // O token irá conter o ID e o código da mochila para identificação futura.
        const payload = {
            MochilaId: mochila.MochilaId,
            MochilaCodigo: mochila.MochilaCodigo,
            tipo: 'iot', // Adiciona um tipo para diferenciar do token de usuário
        };

        // Gerar o token de acesso (curta duração)
        const accessToken = jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: '15m' });

        // Gerar o token de acesso (longa duração)
        const refreshToken = jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: '1d' });

        // Retorna o token gerado com sucesso.
        return res.status(200).json({
            ok: true,
            message: 'Autenticação da mochila realizada com sucesso.',
            accessToken: accessToken,
            refreshToken: refreshToken
        });

    } catch (e) {
        console.error("Erro ao gerar o token para a mochila:", e);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
}
*/

// Validado (28/08) - Criar Mochila
export async function criarMochila(req, res) {
    try {
        const { MochilaPesoMax, password, passwordAdmin, AdminEmail, MochilaDescricao } = req.body;

        let admin;
        if (!password || password.trim() === "" || !passwordAdmin || passwordAdmin.trim() === "" || !AdminEmail || AdminEmail.trim() === "") {
            return res.status(403).json({ error: "Senhas e e-mail obrigatórios para criação" });
        } else {
            admin = await prisma.admins.findUnique({
                where: { AdminEmail: AdminEmail.trim() }
            });

            if (!admin) {
                return res.status(404).json({ error: "Administrador não encontrado" });
            }

            if (! await verificarSenha(password, process.env.PASSWORD_ADD_MOCHILA)) {
                return res.status(403).json({ error: "Senha incorreta" });
            }

            if (! await verificarSenha(passwordAdmin, admin.AdminSenha)) {
                return res.status(403).json({ error: "Senha Incorreta" });
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
        const MochilaStatus = "Produção";

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

// Validado (28/08) - Obter Mochila por código
export async function obterMochilaCodigo(req, res) {
    try {
        const MochilaCodigo = req.params.codigo;

        if (!MochilaCodigo || MochilaCodigo.trim() === "") {
            return res.status(400).json({ error: "Codigo da mochila é obrigatório" });
        }

        const mochila = await prisma.mochilas.findFirst({
            where: { MochilaCodigo: MochilaCodigo.trim(), MochilaStatus: "Ativo" },
            select: {
                MochilaCodigo: true, MochilaPesoMax: true, MochilaDtCadastro: true, MochilaStatus: true, MochilaDescricao: true
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

// Validado (30/08) - Obter mochilas do usuário (ativas)
/*
export async function obterMochilasUsuario(req, res) {
    try {
        let dadosUsuario = await verificarToken(req);

        if (!dadosUsuario) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        const UsuarioId = Number(dadosUsuario.id);

        if (!UsuarioId) {
            return res.status(400).json({ error: 'ID do usuário não encontrado no token.' });
        }

        const vinculosMochilas = await prisma.usuariosMochilas.findMany({
        where: {
            UsuarioId: UsuarioId,
        },
        // Inclui os dados completos da mochila
        include: {
            mochila: {
                select: {
                    MochilaCodigo: true,
                    MochilaPesoMax: true,
                    MochilaDescricao: true,
                    // O status da mochila também deve ser selecionado para o filtro
                    MochilaStatus: true
                },
            },
        },
        orderBy: {
            DataInicioUso: 'desc', // Ordena por data de uso mais recente
        },
    });

    // Filtra as mochilas após a busca, mantendo apenas as ativas
    const mochilasAtivas = vinculosMochilas.filter(vinculo => {
        // Acessa o status da mochila e verifica se é "Ativo"
        return vinculo.mochila && vinculo.mochila.MochilaStatus === 'Ativo';
    });
    return res.json(mochilasAtivas);

    } catch (error) {
        console.error("Erro ao obter mochilas do usuário:", error);
        return res.status(500).json({ error: 'Erro ao obter mochilas do usuário.' });
    }
}
*/

// Validado (30/08) - Alterar Dados ou Somente Senha
export async function alterarMochila(req, res) {
    try {

        const { password, passwordAdmin, AdminEmail } = req.body;

        let admin;
        if (!password || password.trim() === "" || !passwordAdmin || passwordAdmin.trim() === "" || !AdminEmail || AdminEmail.trim() === "") {
            return res.status(403).json({ error: "Senhas e e-mail obrigatórios para alteração" });
        } else {
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

        const MochilaCodigo = req.body.MochilaCodigo;

        if (!MochilaCodigo || MochilaCodigo.trim() === '') {
            return res.status(400).json({ error: "Código da mochila é inválido" });
        }

        const mochila = await prisma.mochilas.findFirst({
            where: {
                MochilaCodigo: MochilaCodigo,
                MochilaStatus: "Produção"
            }
        });

        if (!mochila) {
            return res.status(404).json({ error: "Mochila não encontrada ou já excluída ou não possível edita-la" });
        }

        const AlterarSenha = req.body.AlterarSenha;
        let MochilaSenha = '';
        let MochilaSenhaHash;
        let mochilaAlterada;

        if (AlterarSenha === 'Sim' || AlterarSenha === 'Somente') {
            const gerarCodigoMochila = customAlphabet('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', 12);

            MochilaSenha = gerarCodigoMochila().trim(); // Gera um código aleatório de 8 caracteres para a senha da mochila

            MochilaSenhaHash = await hashSenha(MochilaSenha);
        }

        if (AlterarSenha === 'Somente') {
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

        } else {
            const { MochilaPesoMax, MochilaDescricao } = req.body;

            if (!MochilaPesoMax || isNaN(MochilaPesoMax)) {
                return res.status(400).json({ error: "Peso máximo deve ser um número" })
            }

            if (!MochilaPesoMax || isNaN(MochilaPesoMax) || (MochilaPesoMax < 0.1 || MochilaPesoMax > 50)) {
                return res.status(400).json({ error: "Peso máximo da mochila é obrigatório e deve ser de 0,1 à 50 kg" });
            }

            if (!MochilaDescricao || MochilaDescricao.trim() === '') {
                return res.status(400).json({ error: "Descrição é obrigatoria" })
            }

            const mochila = await prisma.mochilas.findFirst({
                where: {
                    MochilaId: MochilaId,
                    MochilaCodigo: MochilaCodigo,
                    MochilaStatus: "Ativo"
                }
            });

            if (!mochila) {
                return res.status(404).json({ error: "Mochila não encontrada ou já excluída" });
            } else {
                const { password, passwordAdmin, AdminEmail } = req.body;
                if (!password || password.trim() === "" || !passwordAdmin || passwordAdmin.trim() === "" || !AdminEmail || AdminEmail.trim() === "") {
                    return res.status(403).json({ error: "Senhas e e-mail obrigatórios para exclusão" });
                } else {
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

            if (AlterarSenha === 'Sim') {
                // Atualiza os dados da mochila
                await prisma.mochilas.update({
                    where: {
                        MochilaId: MochilaId,
                        MochilaStatus: "Ativo"
                    },
                    data: {
                        MochilaDescricao: MochilaDescricao,
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
            } else {
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
        console.error(error.message);
        return null;
        // res.status(500).json({ error: "Erro ao alterar mochila" });
    }
}

// Validado (28/08) - Alterar Status (Ativo, Produção)
export async function alterarStatusMochila(req, res) {
    try {

        const { password, passwordAdmin, AdminEmail, MochilaStatus } = req.body;

        let admin;
        if (!password || password.trim() === "" || !passwordAdmin || passwordAdmin.trim() === "" || !AdminEmail || AdminEmail.trim() === "") {
            return res.status(403).json({ error: "Senhas e e-mail obrigatórios para a alteração de status" });
        } else {
            admin = await prisma.admins.findUnique({
                where: { AdminEmail: AdminEmail.trim() }
            });

            if (!admin) {
                return res.status(404).json({ error: "Administrador não encontrado" });
            }

            if (! await verificarSenha(password, process.env.PASSWORD_UPDATE_MOCHILA)) {
                return res.status(403).json({ error: "Senha incorreta" });
            } else if (! await verificarSenha(passwordAdmin, admin.AdminSenha)) {
                return res.status(403).json({ error: "Senha Incorreta" });
            }
        }

        const MochilaCodigo = req.body.MochilaCodigo;

        if (!MochilaCodigo || MochilaCodigo.trim() === '') {
            return res.status(400).json({ error: "Código da mochila é inválido" });
        }

        if (!MochilaStatus || (MochilaStatus !== 'Ativo' && MochilaStatus !== 'Produção')) {
            return res.status(400).json({ error: "Status da mochila inválido. Status permitidos ['Ativo', 'Produção']" });
        }

        const mochila = await prisma.mochilas.findFirst({ where: { MochilaCodigo: MochilaCodigo, MochilaStatus: { not: "Inativo" } } });

        if (!mochila) {
            return res.status(404).json({ error: "Mochila não encontrada ou já excluída" });
        }

        const MochilaDtAlteracao = new Date();

        // Atualiza o status da mochila
        await prisma.mochilas.update({
            where: { MochilaId: mochila.MochilaId },
            data: { MochilaStatus: MochilaStatus, AdminId: admin.AdminId, MochilaDtAlteracao: MochilaDtAlteracao }
        });

        return res.json({ ok: true, message: "Status da mochila alterado com sucesso" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro ao alterar status da mochila" });
    }
}

// Validado (28/08) - Desativado (Exclusão lógica)
export async function excluirMochila(req, res) {
    try {

        const { password, passwordAdmin, AdminEmail } = req.body;

        let admin;
        if (!password || password.trim() === "" || !passwordAdmin || passwordAdmin.trim() === "" || !AdminEmail || AdminEmail.trim() === "") {
            return res.status(403).json({ error: "Senhas e e-mail obrigatórios para exclusão" });
        }

        const MochilaCodigo = req.body.MochilaCodigo;

        if (!MochilaCodigo || MochilaCodigo.trim() === '') {
            return res.status(400).json({ error: "Código da mochila é inválido" });
        }

        const mochila = await prisma.mochilas.findFirst({ where: { MochilaCodigo: MochilaCodigo, MochilaStatus: "Ativo" } });

        if (!mochila) {
            return res.status(404).json({ error: "Mochila não encontrada ou já excluída" });
        } else {
            const { password, passwordAdmin, AdminEmail } = req.body;
            if (!password || password.trim() === "" || !passwordAdmin || passwordAdmin.trim() === "" || !AdminEmail || AdminEmail.trim() === "") {
                return res.status(403).json({ error: "Senhas e e-mail obrigatórios para exclusão" });
            } else {
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
            where: { MochilaStatus: "Ativo", MochilaId: mochila.MochilaId },
            data: { MochilaStatus: "Inativo", AdminId: admin.AdminId, MochilaDtAlteracao: MochilaDtAlteracao }
        });

        return res.json({ ok: true, message: "Mochila excluída com sucesso" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro ao excluir mochila" });
    }
}
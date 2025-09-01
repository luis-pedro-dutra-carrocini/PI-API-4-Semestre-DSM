import { Router } from 'express';
import { criarUsuario, obterUsuarioEmail, obterUsuarioId, alterarUsuario, login, logout, excluirUsuario, obterUsuarios, criptografarSenha } from '../controllers/usuarios.js';

const r = Router();

// Para testes
r.get('/criptografarSenha/:senha', criptografarSenha);

r.post('/', criarUsuario);
/* 
JSON Example
{
  "UsuarioNome": "Exemplo de Usuário",
  "UsuarioEmail": "exemplo@email.com",
  "UsuarioSenha": "Senha", // Duas letra mauisculas, duas minusculas, dois numeros e dois caracteres especiais
  "UsuarioDtNascimento": "2025-08-16",
  "UsuarioPeso": 70.55,
  "UsuarioAltura": 1.75,
  "UsuarioSexo": "Masculino" ou "Feminino" ou "Outro" ou "Prefiro não dizer",
  "UsuarioFoto": "nomeFoto.png" ou null,
  "UsuarioPesoMaximoPorcentagem": 7.5
}
*/

r.put('/', alterarUsuario);
/* 
JSON Example
{
  "UsuarioNome": "Exemplo de Usuário",
  "UsuarioEmail": "exemplo@email.com",
  "UsuarioSenha": "Senha"// Duas letra mauisculas, duas minusculas, dois numeros e dois caracteres especiais
  "UsuarioDtNascimento": "2025-08-16",
  "UsuarioPeso": 70.55,
  "UsuarioAltura": 1.75,
  "UsuarioSexo": "Masculino" ou "Feminino" ou "Outro" ou "Prefiro não dizer",
  "UsuarioFoto": "nomeFoto.png" ou "deletar" (delta a foto, deixa null o campo) ou null (mantem a foto atual),
  "UsuarioPesoMaximoPorcentagem": 7.5
}
*/

r.get('/', obterUsuarios)

r.get('/id/:id', obterUsuarioId);
// id na URL, exemplo: /id/1

r.get('/email/:email', obterUsuarioEmail);
// email na URL, exemplo: /email/exemplo@mail.com

r.post('/login', login);
/*
JSON Example
{
  "UsuarioEmail": "exemplo@email.com",
  "UsuarioSenha": "Senha"
}
*/

r.post('/logout', logout);
// Sem parâmetros ou corpo

r.delete('/', excluirUsuario);
/*
JSON Example
{
  "UsuarioSenha": "Senha"}
*/

export default r;
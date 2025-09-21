import { Router } from 'express';
import { criarUsuario, obterUsuarioLogado, alterarUsuario, login, excluirUsuario, logout } from '../controllers/usuarios.js';

const r = Router();

// Para testes
//r.get('/criptografarSenha/:senha', criptografarSenha);

//r.get('/', obterUsuarios);

//r.post('/logout', logout);

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

r.get('/id/', obterUsuarioLogado);

//r.get('/email/:email', obterUsuarioEmail);

r.post('/login', login);
/*
JSON Example
{
  "UsuarioEmail": "exemplo@email.com",
  "UsuarioSenha": "Senha",
  "TipoLogin": "App" ou "Web"
}
*/

r.post('/logout', logout);
/*
JSON Example
{
  "token": "Bearer token_de_refresh_aqui"
}
*/

r.delete('/', excluirUsuario);
/*
JSON Example
{
  "UsuarioSenha": "Senha"
}
*/

export default r;
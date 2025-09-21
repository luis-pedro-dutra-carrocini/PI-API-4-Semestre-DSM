import { Router } from 'express';
import { criarMochila, obterMochilaCodigo, excluirMochila, alterarMochila,  loginMochila, alterarStatusMochila } from '../controllers/mochilas.js';

const r = Router();

//r.get('/usuario', obterMochilasUsuario);

//r.get('/', obterMochilas);

//r.get('/id/:id', obterMochilaId);

r.post('/', criarMochila);
/*
JSON Example
{
  "MochilaPesoMax": 10.5, 
  "MochilaDescricao": "Mochila de Exemplo",
  "AdminEmail": "adminexemplo@email.com",
  "passwordAdmin": "senhaAdmin",
  "password": "senhaCadastroMochila"
}
*/

r.post('/loginMochila', loginMochila);
/*
    "MochilaCodigo": "Anunufnsw",
    "assinatura": "a",
    "timestamp": "2023-11-20T15:04:05.000Z"
*/

r.get('/codigo/:codigo', obterMochilaCodigo);

r.put('/', alterarMochila);
/*
JSON Example
{
  "MochilaCodigo": "D8aapJDzLoWs",
  "MochilaPesoMax": 10.5, 
  "MochilaDescricao": "Mochila de Exemplo",
  "AlterarSenha": "Sim" ou "Somente" ou "Não" ou não informado =  Não
  "AdminEmail": "adminexemplo@email.com",
  "passwordAdmin": "senhaAdmin",
  "password": "senhaAlteracaoMochila"
}
*/

r.put('/status/s', alterarStatusMochila);
/*
JSON Example
{
  "MochilaCodigo": "D8aapJDzLoWs",
  "MochilaStatus": "Ativo" ou "Produção",
  "AdminEmail": "adminexemplo@email.com",
  "passwordAdmin": "senhaAdmin",
  "password": "senhaAlteracaoMochila"
}
*/

r.delete('/', excluirMochila);
/*
JSON Example
{
  "MochilaId": 1
  "MochilaCodigo":"D8aapJDzLoWs"
  "AdminEmail": "adminexemplo@email.com",
  "passwordAdmin": "senhaAdmin",
  "password": "senhaExclusaoMochila"
}
*/

export default r;
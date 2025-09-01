import { Router } from 'express';
import { obterMochilas, criarMochila, obterMochilaCodigo, obterMochilaId, excluirMochila, alterarMochila } from '../controllers/mochilas.js';

const r = Router();

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

r.get('/', obterMochilas);

r.get('/codigo/:codigo', obterMochilaCodigo);

r.get('/id/:id', obterMochilaId);

r.put('/', alterarMochila);
/*
JSON Example
{
  "MochilaId": 1,
  "MochilaCodigo": "D8aapJDzLoWs",
  "MochilaPesoMax": 10.5, 
  "MochilaDescricao": "Mochila de Exemplo",
  "AlterarSenha": "Sim" ou "Somente" ou "Não" ou não informado =  Não
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
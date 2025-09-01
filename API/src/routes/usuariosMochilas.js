import { Router } from 'express';
import { assumirUsoMochila, encerrarUsoApp, encerrarUsoIOT, listarUsuariosMochilas, vincularMochila, obterMochilaUsuario } from '../controllers/usuariosMochilas.js';
const r = Router();

r.get('/', listarUsuariosMochilas);

r.get('/usuario', obterMochilaUsuario); 

r.post('/assumir', assumirUsoMochila);   
/*
{ 
    "MochilaCodigo": "58PiojQh2otM"
}
*/

r.post('/encerrarUsoApp', encerrarUsoApp); 
/*
{ 
    "MochilaCodigo": "58PiojQh2otM"
}
*/

r.post('/encerrarUsoIOT', encerrarUsoIOT); 

/*
{
  "MochilaCodigo": "58PiojQh2otM",
  "MochilaSenha": "aaaaa"
}
*/

r.post('/vincular', vincularMochila); 
/*
{ 
    "MochilaCodigo": "58PiojQh2otM", 
    "MochilaNome": "Apelido Mochila"
}
*/


export default r;

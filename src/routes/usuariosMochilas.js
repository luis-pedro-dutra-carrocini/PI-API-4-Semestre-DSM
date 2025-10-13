import { Router } from 'express';
import { assumirUsoMochila, encerrarUsoApp, encerrarUsoIOT, vincularMochila, obterMochilaUsuario, obterMochilaUsuarioUso, editarNomeMochila, desvincularMochila } from '../controllers/usuariosMochilas.js';
const r = Router();

//r.get('/', listarUsuariosMochilas);

r.get('/usuario', obterMochilaUsuario); 

r.post('/assumir', assumirUsoMochila);   
/*
{ 
    "MochilaCodigo": "58PiojQh2otM"
}
*/

r.get('/mochilaUso', obterMochilaUsuarioUso); 


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

r.delete('/desvincular', desvincularMochila); 
/*
{ 
    "MochilaCodigo": "codigo"
}
*/

r.put('/editarNome', editarNomeMochila);
/*
{
    "MochilaCodigo": "codigo",
    "MochilaNome": "novoNome"
}
*/

export default r;

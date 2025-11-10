import { Router } from 'express';
import { criarMedicao, obterRelatorioSemanal, obterRelatorioMensal, obterRelatorioAnual, obterRelatorioDia,obterDiaMaisMenosPeso, obterMedicoesPorPeriodo, obterUltimaMedicaoMochilaUsuario, obterRelatorioGeral, obterPrevisaoPorDia } from '../controllers/medicoes.js';

const r = Router();

//r.post('/login/', loginMochila);
/*
    "MochilaCodigo": "Anunufnsw",
    "MochilaSenha": "a"
*/

//r.get('/', obterMedicoes);

r.post('/', criarMedicao);
/*
    "MedicaoPeso": 8.3,
    "MedicaoLocal": "esquerda"
*/

//r.post('/lote', criarMedicoesLote);

r.get('/previsao/:mochila/:data', obterPrevisaoPorDia);

r.get('/atual/:mochila', obterUltimaMedicaoMochilaUsuario);

r.get('/semanal/:mochila', obterRelatorioSemanal);

r.get('/geral/:mochila', obterRelatorioGeral);

r.get('/mensal/:ano/:mes/:mochila', obterRelatorioMensal);

r.get('/anual/:ano/:mochila', obterRelatorioAnual);

r.get('/dia/:data/:mochila', obterRelatorioDia);
    
r.get('/diaMaisMenosPeso/:mochila', obterDiaMaisMenosPeso);

r.get('/periodo/:inicio/:fim/:mochila', obterMedicoesPorPeriodo);

export default r;

import { Router } from 'express';
import { criarMedicao, obterMedicoes, obterRelatorioSemanal, obterRelatorioMensal, obterRelatorioAnual, obterRelatorioDia,obterDiaMaisMenosPeso, obterMedicoesPorPeriodo } from '../controllers/medicoes.js';

const r = Router();

r.post('/', criarMedicao);
/*
    "MochilaCodigo": "Anunufnsw",
    "MochilaSenha": "a",
    "MedicaoPeso": 8.3,
    "MedicaoLocal": "esquerda"
*/

r.get('/', obterMedicoes);

r.get('/semanal/:mochila', obterRelatorioSemanal);
r.get('/mensal/:ano/:mes/:mochila', obterRelatorioMensal);
r.get('/anual/:ano/:mochila', obterRelatorioAnual);
r.get('/dia/:data/:mochila', obterRelatorioDia);
r.get('/diaMaisMenosPeso/:mochila', obterDiaMaisMenosPeso);
r.get('/periodo/:inicio/:fim/:mochila', obterMedicoesPorPeriodo);

export default r;

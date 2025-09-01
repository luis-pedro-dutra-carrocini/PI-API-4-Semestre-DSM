import { Router } from 'express';
import { criarAlerta, listarAlertas, listarAlertasMedicao , obterAlerta, atualizarAlerta, listarAlertasUsuario } from '../controllers/alertas.js';

const r = Router();
r.post('/', criarAlerta);
/*
{
  "MedicaoId": 1,
  "AlertaTitulo": "Exemplo de Alerta",
  "AlertaDescricao": "Descrição do alerta",
  "AlertaNivel": "Alto" ou "Baixo" ou "Médio",
  "AlertaStatus": "Enviar" ou "Enviado" ou "Lido" ou null (sem esse campo, o padrão é "Enviar")
}
*/

r.get('/', listarAlertas);

r.get('/medicao/:id', listarAlertasMedicao);

r.get('/:id', obterAlerta);

r.get('/usuario/:nada', listarAlertasUsuario)

r.put('/:id', atualizarAlerta);
/*
{
  "AlertaStatus": "Enviar" ou "Enviado" ou "Lido"
}
*/

//r.delete('/:id', deletarAlerta);

export default r;
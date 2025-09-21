import { Router } from 'express';
import { refresh, validarToken } from '../controllers/tokenJWT.js';

const r = Router();

r.get('/validarToken', validarToken);

r.post('/refresh', refresh);

export default r;
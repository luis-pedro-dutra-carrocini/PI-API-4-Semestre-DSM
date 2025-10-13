import { Router } from 'express';
import { refresh, validarToken } from '../controllers/tokenJWT.js';

const r = Router();

r.post('/validarToken', validarToken);

r.post('/refresh', refresh);

export default r;
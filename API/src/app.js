import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';

import usuariosRotas from './routes/usuarios.js';
import medicoesRoutes from './routes/medicoes.js';
import mochilasRoutes from './routes/mochilas.js';
import alertasRoutes from './routes/alertas.js';
import usuariosMochilasRoutes from './routes/usuariosMochilas.js';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Configuração da sessão
app.use(session({
  secret: process.env.SESSION_SECRET, // use uma chave forte em produção
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 120 } // sessão expira em 2 hrs
}));

// Rotas
app.use('/usuarios', usuariosRotas);
app.use('/medicoes', medicoesRoutes);
app.use('/usuarios-mochilas', usuariosMochilasRoutes);
app.use('/mochilas', mochilasRoutes);
app.use('/alertas', alertasRoutes);

app.get('/health', (_req, res) => res.json({ ok: true }));

export default app;

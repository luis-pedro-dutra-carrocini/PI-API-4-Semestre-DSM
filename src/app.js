import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import path from 'path'; // Importa o módulo path
import { fileURLToPath } from 'url'; // Para __dirname em módulos ES

// Para simular __dirname em módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import usuariosRotas from './routes/usuarios.js';
import medicoesRoutes from './routes/medicoes.js';
import mochilasRoutes from './routes/mochilas.js';
import alertasRoutes from './routes/alertas.js';
import usuariosMochilasRoutes from './routes/usuariosMochilas.js';
import tokenRoutes from './routes/tokenJWT.js';

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

// Servir os arquivos estáticos da documentação
// Todos os arquivos dentro de 'public' serão acessíveis.
// Ex: public/docs/index.html -> /docs/index.html
app.use(express.static(path.join(__dirname, 'public')));

// Rota para a documentação na URL raiz (http://localhost:3000/)
app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rotas da API
app.use('/usuarios', usuariosRotas);
app.use('/medicoes', medicoesRoutes);
app.use('/usuarios-mochilas', usuariosMochilasRoutes);
app.use('/mochilas', mochilasRoutes);
app.use('/alertas', alertasRoutes);
app.use('/token', tokenRoutes); 

app.get('/health', (_req, res) => res.json({ ok: true }));

export default app;
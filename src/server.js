import app from './app.js';
import { prisma } from './prisma.js';

const PORT = process.env.PORT || 3001;

// 🔄 CORREÇÃO: Armazena o servidor em uma variável
const server = app.listen(PORT, "0.0.0.0", () => {
	console.log(`API on http://localhost:${PORT}`);
});

// Encerrar o Prisma de forma limpa quando o servidor for parado
process.on('SIGINT', async () => {
  console.log('🛑 Encerrando servidor...');
  await prisma.$disconnect();
  server.close(() => {
    console.log('Servidor e Prisma desconectados com sucesso.');
    process.exit(0);
  });
});

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
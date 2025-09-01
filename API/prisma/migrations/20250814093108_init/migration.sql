-- CreateTable
CREATE TABLE "public"."Usuarios" (
    "UsuarioId" SERIAL NOT NULL,
    "UsuarioNome" TEXT NOT NULL,
    "UsuarioEmail" TEXT NOT NULL,
    "UsuarioSenha" TEXT NOT NULL,
    "UsuarioDtCadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UsuarioPeso" DECIMAL(5,2),
    "UsuarioAltura" DECIMAL(4,2),

    CONSTRAINT "Usuarios_pkey" PRIMARY KEY ("UsuarioId")
);

-- CreateTable
CREATE TABLE "public"."Mochilas" (
    "MochilaId" SERIAL NOT NULL,
    "MochilaCodigo" TEXT NOT NULL,
    "MochilaPesoMax" DECIMAL(6,2),
    "MochilaDtCadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mochilas_pkey" PRIMARY KEY ("MochilaId")
);

-- CreateTable
CREATE TABLE "public"."Usuarios_Mochilas" (
    "UsuarioId" INTEGER NOT NULL,
    "MochilaId" INTEGER NOT NULL,
    "MochilaNome" TEXT,
    "UsoStatus" TEXT,
    "DataInicioUso" TIMESTAMP(3),
    "DataFimUso" TIMESTAMP(3),

    CONSTRAINT "Usuarios_Mochilas_pkey" PRIMARY KEY ("UsuarioId","MochilaId")
);

-- CreateTable
CREATE TABLE "public"."Medicoes" (
    "MedicaoId" SERIAL NOT NULL,
    "MochilaId" INTEGER NOT NULL,
    "UsuarioId" INTEGER NOT NULL,
    "MedicaoLocal" TEXT,
    "MedicaoPeso" DECIMAL(6,2) NOT NULL,
    "MedicaoData" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "MedicaoStatus" TEXT,

    CONSTRAINT "Medicoes_pkey" PRIMARY KEY ("MedicaoId")
);

-- CreateTable
CREATE TABLE "public"."Alertas" (
    "AlertaId" SERIAL NOT NULL,
    "MedicaoId" INTEGER NOT NULL,
    "AlertaMensagem" TEXT NOT NULL,
    "AlertaNivel" TEXT NOT NULL,
    "AlertaData" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alertas_pkey" PRIMARY KEY ("AlertaId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuarios_UsuarioEmail_key" ON "public"."Usuarios"("UsuarioEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Mochilas_MochilaCodigo_key" ON "public"."Mochilas"("MochilaCodigo");

-- CreateIndex
CREATE INDEX "Usuarios_Mochilas_MochilaId_idx" ON "public"."Usuarios_Mochilas"("MochilaId");

-- AddForeignKey
ALTER TABLE "public"."Usuarios_Mochilas" ADD CONSTRAINT "Usuarios_Mochilas_UsuarioId_fkey" FOREIGN KEY ("UsuarioId") REFERENCES "public"."Usuarios"("UsuarioId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Usuarios_Mochilas" ADD CONSTRAINT "Usuarios_Mochilas_MochilaId_fkey" FOREIGN KEY ("MochilaId") REFERENCES "public"."Mochilas"("MochilaId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Medicoes" ADD CONSTRAINT "Medicoes_MochilaId_fkey" FOREIGN KEY ("MochilaId") REFERENCES "public"."Mochilas"("MochilaId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Medicoes" ADD CONSTRAINT "Medicoes_UsuarioId_fkey" FOREIGN KEY ("UsuarioId") REFERENCES "public"."Usuarios"("UsuarioId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Alertas" ADD CONSTRAINT "Alertas_MedicaoId_fkey" FOREIGN KEY ("MedicaoId") REFERENCES "public"."Medicoes"("MedicaoId") ON DELETE CASCADE ON UPDATE CASCADE;

-- só pode existir UMA linha com dataFimUso IS NULL por mochila
CREATE UNIQUE INDEX IF NOT EXISTS ux_uso_ativo_por_mochila
ON "UsuarioMochila" ("mochilaId")
WHERE "dataFimUso" IS NULL;
-- CreateTable
CREATE TABLE "public"."Usuarios" (
    "UsuarioId" SERIAL NOT NULL,
    "UsuarioNome" VARCHAR(100) NOT NULL,
    "UsuarioEmail" VARCHAR(260) NOT NULL,
    "UsuarioSenha" TEXT NOT NULL,
    "UsuarioDtCadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UsuarioDtNascimento" TIMESTAMP(3) NOT NULL,
    "UsuarioPeso" DECIMAL(5,2),
    "UsuarioAltura" DECIMAL(4,2),
    "UsuarioSexo" VARCHAR(20),
    "UsuarioStatus" VARCHAR(20),
    "UsuarioFoto" TEXT,
    "UsuarioUltimoAcesso" TIMESTAMP(3),
    "UsuarioPesoMaximoPorcentagem" DECIMAL(5,2),

    CONSTRAINT "Usuarios_pkey" PRIMARY KEY ("UsuarioId")
);

-- CreateTable
CREATE TABLE "public"."Mochilas" (
    "MochilaId" SERIAL NOT NULL,
    "MochilaCodigo" TEXT NOT NULL,
    "MochilaSenha" TEXT NOT NULL,
    "MochilaPesoMax" DECIMAL(6,2),
    "MochilaDtCadastro" TIMESTAMP(3) NOT NULL,
    "MochilaDtAlteracao" TIMESTAMP(3),
    "MochilaStatus" VARCHAR(20),
    "MochilaDescricao" TEXT,
    "AdminId" INTEGER,

    CONSTRAINT "Mochilas_pkey" PRIMARY KEY ("MochilaId")
);

-- CreateTable
CREATE TABLE "public"."Usuarios_Mochilas" (
    "UsuarioId" INTEGER NOT NULL,
    "MochilaId" INTEGER NOT NULL,
    "MochilaNome" VARCHAR(100),
    "UsoStatus" VARCHAR(20),
    "DataInicioUso" TIMESTAMP(3),
    "DataFimUso" TIMESTAMP(3),

    CONSTRAINT "Usuarios_Mochilas_pkey" PRIMARY KEY ("UsuarioId","MochilaId")
);

-- CreateTable
CREATE TABLE "public"."Medicoes" (
    "MedicaoId" SERIAL NOT NULL,
    "MochilaId" INTEGER NOT NULL,
    "UsuarioId" INTEGER NOT NULL,
    "MedicaoLocal" VARCHAR(20),
    "MedicaoPeso" DECIMAL(6,2) NOT NULL,
    "MedicaoData" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "MedicaoStatus" VARCHAR(50),
    "MedicaoPesoMaximoPorcentagem" DECIMAL(5,2),
    "MedicaoPesoMais" DECIMAL(6,2) NOT NULL,

    CONSTRAINT "Medicoes_pkey" PRIMARY KEY ("MedicaoId")
);

-- CreateTable
CREATE TABLE "public"."Alertas" (
    "AlertaId" SERIAL NOT NULL,
    "MedicaoId" INTEGER NOT NULL,
    "UsuarioId" INTEGER NOT NULL,
    "AlertaTitulo" VARCHAR(60) NOT NULL,
    "AlertaDescricao" TEXT,
    "AlertaNivel" VARCHAR(20) NOT NULL,
    "AlertaData" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "AlertaStatus" VARCHAR(20),

    CONSTRAINT "Alertas_pkey" PRIMARY KEY ("AlertaId")
);

-- CreateTable
CREATE TABLE "public"."Admins" (
    "AdminId" SERIAL NOT NULL,
    "AdminNivel" VARCHAR(20) NOT NULL,
    "AdminEmail" VARCHAR(260) NOT NULL,
    "AdminSenha" TEXT NOT NULL,
    "AdminDtCadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Admins_pkey" PRIMARY KEY ("AdminId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuarios_UsuarioEmail_key" ON "public"."Usuarios"("UsuarioEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Mochilas_MochilaCodigo_key" ON "public"."Mochilas"("MochilaCodigo");

-- CreateIndex
CREATE UNIQUE INDEX "Mochilas_MochilaSenha_key" ON "public"."Mochilas"("MochilaSenha");

-- CreateIndex
CREATE INDEX "Usuarios_Mochilas_MochilaId_idx" ON "public"."Usuarios_Mochilas"("MochilaId");

-- CreateIndex
CREATE UNIQUE INDEX "Admins_AdminEmail_key" ON "public"."Admins"("AdminEmail");

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

/*
  Warnings:

  - A unique constraint covering the columns `[MochilaChavePublica]` on the table `Mochilas` will be added. If there are existing duplicate values, this will fail.
  - Made the column `AlertaDescricao` on table `Alertas` required. This step will fail if there are existing NULL values in that column.
  - Made the column `AlertaStatus` on table `Alertas` required. This step will fail if there are existing NULL values in that column.
  - Made the column `MedicaoLocal` on table `Medicoes` required. This step will fail if there are existing NULL values in that column.
  - Made the column `MedicaoStatus` on table `Medicoes` required. This step will fail if there are existing NULL values in that column.
  - Made the column `MedicaoPesoMaximoPorcentagem` on table `Medicoes` required. This step will fail if there are existing NULL values in that column.
  - Made the column `MochilaPesoMax` on table `Mochilas` required. This step will fail if there are existing NULL values in that column.
  - Made the column `MochilaStatus` on table `Mochilas` required. This step will fail if there are existing NULL values in that column.
  - Made the column `MochilaDescricao` on table `Mochilas` required. This step will fail if there are existing NULL values in that column.
  - Made the column `AdminId` on table `Mochilas` required. This step will fail if there are existing NULL values in that column.
  - Made the column `UsuarioPeso` on table `Usuarios` required. This step will fail if there are existing NULL values in that column.
  - Made the column `UsuarioAltura` on table `Usuarios` required. This step will fail if there are existing NULL values in that column.
  - Made the column `UsuarioSexo` on table `Usuarios` required. This step will fail if there are existing NULL values in that column.
  - Made the column `UsuarioStatus` on table `Usuarios` required. This step will fail if there are existing NULL values in that column.
  - Made the column `MochilaNome` on table `UsuariosMochilas` required. This step will fail if there are existing NULL values in that column.
  - Made the column `UsoStatus` on table `UsuariosMochilas` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Alertas" ALTER COLUMN "AlertaDescricao" SET NOT NULL,
ALTER COLUMN "AlertaStatus" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."Medicoes" ALTER COLUMN "MedicaoLocal" SET NOT NULL,
ALTER COLUMN "MedicaoStatus" SET NOT NULL,
ALTER COLUMN "MedicaoPesoMaximoPorcentagem" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."Mochilas" ADD COLUMN     "MochilaChavePublica" TEXT,
ALTER COLUMN "MochilaPesoMax" SET NOT NULL,
ALTER COLUMN "MochilaStatus" SET NOT NULL,
ALTER COLUMN "MochilaDescricao" SET NOT NULL,
ALTER COLUMN "AdminId" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."Usuarios" ALTER COLUMN "UsuarioPeso" SET NOT NULL,
ALTER COLUMN "UsuarioAltura" SET NOT NULL,
ALTER COLUMN "UsuarioSexo" SET NOT NULL,
ALTER COLUMN "UsuarioStatus" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."UsuariosMochilas" ALTER COLUMN "MochilaNome" SET NOT NULL,
ALTER COLUMN "UsoStatus" SET NOT NULL;

-- CreateTable
CREATE TABLE "public"."TokensRevogados" (
    "token" VARCHAR(512) NOT NULL,
    "revogadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokensRevogados_pkey" PRIMARY KEY ("token")
);

-- CreateIndex
CREATE UNIQUE INDEX "Mochilas_MochilaChavePublica_key" ON "public"."Mochilas"("MochilaChavePublica");

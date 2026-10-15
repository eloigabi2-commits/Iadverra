-- CreateEnum
CREATE TYPE "CategoriaTipo" AS ENUM ('RECEITA', 'DESPESA');

-- CreateEnum
CREATE TYPE "LancamentoStatus" AS ENUM ('CONFIRMADO', 'PENDENTE');

-- CreateEnum
CREATE TYPE "AjusteTipo" AS ENUM ('RETIRADA', 'DISTRIBUICAO');

-- CreateTable
CREATE TABLE "Configuracao" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "nomeEmpresa" TEXT NOT NULL DEFAULT '',
    "anoReferencia" INTEGER NOT NULL DEFAULT 2026,
    "saldoInicial" DECIMAL(14,2) NOT NULL DEFAULT 0,

    CONSTRAINT "Configuracao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" SERIAL NOT NULL,
    "tipo" "CategoriaTipo" NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lancamento" (
    "id" SERIAL NOT NULL,
    "categoriaId" INTEGER NOT NULL,
    "data" DATE NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "valor" DECIMAL(14,2) NOT NULL,
    "status" "LancamentoStatus" NOT NULL DEFAULT 'CONFIRMADO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lancamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ajuste" (
    "id" SERIAL NOT NULL,
    "tipo" "AjusteTipo" NOT NULL,
    "data" DATE NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "valor" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "Ajuste_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Categoria_tipo_ordem_idx" ON "Categoria"("tipo", "ordem");

-- CreateIndex
CREATE INDEX "Lancamento_data_idx" ON "Lancamento"("data");

-- CreateIndex
CREATE INDEX "Lancamento_categoriaId_idx" ON "Lancamento"("categoriaId");

-- CreateIndex
CREATE INDEX "Ajuste_data_idx" ON "Ajuste"("data");

-- AddForeignKey
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

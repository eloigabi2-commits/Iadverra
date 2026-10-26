-- CreateTable
CREATE TABLE "atendente" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "atendente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "atendente_nome_key" ON "atendente"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "atendente_chave_key" ON "atendente"("chave");


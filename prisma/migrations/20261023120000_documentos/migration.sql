-- CreateTable
CREATE TABLE "solicitacao_documento" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "nome" TEXT,
    "telefone" TEXT,
    "referencia" TEXT,
    "status" TEXT NOT NULL DEFAULT 'aguardando',
    "consentimento_em" TIMESTAMP(3),
    "enviado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solicitacao_documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "foto_documento" (
    "id" TEXT NOT NULL,
    "solicitacao_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "dados" BYTEA NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "foto_documento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "solicitacao_documento_token_key" ON "solicitacao_documento"("token");

-- CreateIndex
CREATE INDEX "solicitacao_documento_status_criado_em_idx" ON "solicitacao_documento"("status", "criado_em");

-- CreateIndex
CREATE INDEX "solicitacao_documento_telefone_idx" ON "solicitacao_documento"("telefone");

-- CreateIndex
CREATE INDEX "solicitacao_documento_referencia_idx" ON "solicitacao_documento"("referencia");

-- CreateIndex
CREATE UNIQUE INDEX "foto_documento_solicitacao_id_tipo_key" ON "foto_documento"("solicitacao_id", "tipo");

-- AddForeignKey
ALTER TABLE "foto_documento" ADD CONSTRAINT "foto_documento_solicitacao_id_fkey" FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacao_documento"("id") ON DELETE CASCADE ON UPDATE CASCADE;


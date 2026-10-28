CREATE TABLE "cliente_credito" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cliente_credito_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "cliente_credito_email_idx" ON "cliente_credito"("email");

CREATE TABLE "pedido_credito" (
    "id" TEXT NOT NULL,
    "conta_id" TEXT NOT NULL,
    "cobranca_id" TEXT,
    "valor" DECIMAL(10,2) NOT NULL,
    "forma_pagamento" TEXT NOT NULL,
    "prazo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'aguardando_pagamento',
    "webhook_status" INTEGER,
    "webhook_erro" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedido_credito_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pedido_credito_cobranca_id_key" ON "pedido_credito"("cobranca_id");
CREATE INDEX "pedido_credito_conta_id_criado_em_idx" ON "pedido_credito"("conta_id", "criado_em");

ALTER TABLE "pedido_credito" ADD CONSTRAINT "pedido_credito_conta_id_fkey" FOREIGN KEY ("conta_id") REFERENCES "cliente_credito"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pedido_credito" ADD CONSTRAINT "pedido_credito_cobranca_id_fkey" FOREIGN KEY ("cobranca_id") REFERENCES "cobranca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

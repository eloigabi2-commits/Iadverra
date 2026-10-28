-- Cobranças reais (Pix e cartão de crédito) criadas na API do Asaas.
-- O cartão nunca é gravado: guardamos só os 4 últimos dígitos e a bandeira.

CREATE TABLE "cobranca" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "solicitacao_id" TEXT,
    "atendente" TEXT,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "cpf_cnpj" VARCHAR(14) NOT NULL,
    "telefone" TEXT,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "forma_pagamento" TEXT,
    "parcela" INTEGER NOT NULL DEFAULT 1,
    "asaas_customer_id" TEXT,
    "asaas_payment_id" TEXT,
    "invoice_url" TEXT,
    "pix_payload" TEXT,
    "pix_imagem" TEXT,
    "pix_expira_em" TIMESTAMP(3),
    "cartao_final" VARCHAR(4),
    "cartao_bandeira" TEXT,
    "pago_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cobranca_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cobranca_codigo_key" ON "cobranca"("codigo");
CREATE UNIQUE INDEX "cobranca_asaas_payment_id_key" ON "cobranca"("asaas_payment_id");
CREATE INDEX "cobranca_status_criado_em_idx" ON "cobranca"("status", "criado_em");
CREATE INDEX "cobranca_solicitacao_id_idx" ON "cobranca"("solicitacao_id");
CREATE INDEX "cobranca_atendente_idx" ON "cobranca"("atendente");

CREATE TABLE "asaas_evento" (
    "id" TEXT NOT NULL,
    "evento" TEXT NOT NULL,
    "pagamento_id" TEXT,
    "cobranca_id" TEXT,
    "recebido_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asaas_evento_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "asaas_evento_pagamento_id_idx" ON "asaas_evento"("pagamento_id");
CREATE INDEX "asaas_evento_cobranca_id_idx" ON "asaas_evento"("cobranca_id");

ALTER TABLE "cobranca" ADD CONSTRAINT "cobranca_solicitacao_id_fkey" FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacao_documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "asaas_evento" ADD CONSTRAINT "asaas_evento_cobranca_id_fkey" FOREIGN KEY ("cobranca_id") REFERENCES "cobranca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

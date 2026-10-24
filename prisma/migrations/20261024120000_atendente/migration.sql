-- AlterTable
ALTER TABLE "solicitacao_documento" ADD COLUMN     "atendente" TEXT;

-- CreateIndex
CREATE INDEX "solicitacao_documento_atendente_status_idx" ON "solicitacao_documento"("atendente", "status");


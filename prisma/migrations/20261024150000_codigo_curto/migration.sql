-- AlterTable
ALTER TABLE "solicitacao_documento" ADD COLUMN     "codigo" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "solicitacao_documento_codigo_key" ON "solicitacao_documento"("codigo");


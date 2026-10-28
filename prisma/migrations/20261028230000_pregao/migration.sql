CREATE TABLE "usuario_pregao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "estado" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuario_pregao_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "usuario_pregao_email_key" ON "usuario_pregao"("email");

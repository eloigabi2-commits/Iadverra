-- Instagram: conexões criadas pela extensão "Instagram Ponte".
-- O servidor guarda o hash do código, nunca cookies ou senha do Instagram.

CREATE TABLE "instagram_conexao" (
    "id" TEXT NOT NULL,
    "codigo_hash" TEXT NOT NULL,
    "ig_user_id" TEXT,
    "username" TEXT,
    "nome" TEXT,
    "foto_url" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultima_sync" TIMESTAMP(3),

    CONSTRAINT "instagram_conexao_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "instagram_conexao_codigo_hash_key" ON "instagram_conexao"("codigo_hash");
CREATE INDEX "instagram_conexao_username_idx" ON "instagram_conexao"("username");

CREATE TABLE "instagram_snapshot" (
    "id" TEXT NOT NULL,
    "conexao_id" TEXT NOT NULL,
    "seguidores" JSONB NOT NULL,
    "seguindo" JSONB NOT NULL,
    "seguidores_total" INTEGER NOT NULL,
    "seguindo_total" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instagram_snapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "instagram_snapshot_conexao_id_criado_em_idx" ON "instagram_snapshot"("conexao_id", "criado_em");

CREATE TABLE "instagram_sumido" (
    "id" TEXT NOT NULL,
    "conexao_id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "ig_perfil_id" TEXT,
    "username" TEXT NOT NULL,
    "nome" TEXT,
    "foto_url" TEXT,
    "origem" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'sumiu',
    "detectado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verificado_em" TIMESTAMP(3),

    CONSTRAINT "instagram_sumido_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "instagram_sumido_conexao_id_chave_key" ON "instagram_sumido"("conexao_id", "chave");
CREATE INDEX "instagram_sumido_conexao_id_estado_idx" ON "instagram_sumido"("conexao_id", "estado");

ALTER TABLE "instagram_snapshot" ADD CONSTRAINT "instagram_snapshot_conexao_id_fkey" FOREIGN KEY ("conexao_id") REFERENCES "instagram_conexao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "instagram_sumido" ADD CONSTRAINT "instagram_sumido_conexao_id_fkey" FOREIGN KEY ("conexao_id") REFERENCES "instagram_conexao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

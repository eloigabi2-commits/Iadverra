-- Login dentro do app: sessão do Instagram criptografada (AES-256-GCM) e estado
-- pendente de 2FA. A senha nunca é gravada.
ALTER TABLE "instagram_conexao" ADD COLUMN IF NOT EXISTS "cookies" TEXT;
ALTER TABLE "instagram_conexao" ADD COLUMN IF NOT EXISTS "cookies_em" TIMESTAMP(3);
ALTER TABLE "instagram_conexao" ADD COLUMN IF NOT EXISTS "pendente" TEXT;
ALTER TABLE "instagram_conexao" ADD COLUMN IF NOT EXISTS "pendente_em" TIMESTAMP(3);

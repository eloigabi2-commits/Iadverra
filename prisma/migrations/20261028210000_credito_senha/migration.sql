ALTER TABLE "cliente_credito" ADD COLUMN "senha_hash" TEXT;

UPDATE "cliente_credito" SET "email" = lower(btrim("email"));

CREATE TEMP TABLE "_credito_duplicados" AS
SELECT c."id" AS "duplicado", k."keep_id"
FROM "cliente_credito" c
JOIN (
    SELECT lower("email") AS "email", (array_agg("id" ORDER BY "criado_em", "id"))[1] AS "keep_id"
    FROM "cliente_credito"
    GROUP BY lower("email")
    HAVING count(*) > 1
) k ON lower(c."email") = k."email"
WHERE c."id" <> k."keep_id";

UPDATE "pedido_credito" p
SET "conta_id" = d."keep_id"
FROM "_credito_duplicados" d
WHERE p."conta_id" = d."duplicado";

DELETE FROM "cliente_credito" c
USING "_credito_duplicados" d
WHERE c."id" = d."duplicado";

DROP TABLE "_credito_duplicados";

DROP INDEX IF EXISTS "cliente_credito_email_idx";
CREATE UNIQUE INDEX "cliente_credito_email_key" ON "cliente_credito"("email");

-- CreateTable
CREATE TABLE "Cnae" (
    "codigo" VARCHAR(7) NOT NULL,
    "descricao" TEXT NOT NULL,

    CONSTRAINT "Cnae_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "NaturezaJuridica" (
    "codigo" VARCHAR(4) NOT NULL,
    "descricao" TEXT NOT NULL,

    CONSTRAINT "NaturezaJuridica_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "Municipio" (
    "codigo" VARCHAR(4) NOT NULL,
    "descricao" TEXT NOT NULL,

    CONSTRAINT "Municipio_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "Empresa" (
    "cnpj_basico" VARCHAR(8) NOT NULL,
    "razao_social" TEXT NOT NULL,
    "natureza_juridica_cod" VARCHAR(4),
    "qualificacao_responsavel" VARCHAR(2),
    "capital_social" DECIMAL(18,2),
    "porte_empresa" VARCHAR(2),

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("cnpj_basico")
);

-- CreateTable
CREATE TABLE "Estabelecimento" (
    "cnpj_basico" VARCHAR(8) NOT NULL,
    "cnpj_ordem" VARCHAR(4) NOT NULL,
    "cnpj_dv" VARCHAR(2) NOT NULL,
    "cnpj_completo" VARCHAR(14) NOT NULL,
    "identificador_matriz_filial" VARCHAR(1),
    "nome_fantasia" TEXT,
    "situacao_cadastral" VARCHAR(2),
    "data_inicio_atividade" DATE,
    "cnae_fiscal_principal" VARCHAR(7),
    "cnae_fiscal_secundaria" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cep" VARCHAR(8),
    "uf" VARCHAR(2),
    "municipio_cod" VARCHAR(4),
    "ddd1" VARCHAR(4),
    "telefone1" VARCHAR(10),
    "ddd2" VARCHAR(4),
    "telefone2" VARCHAR(10),
    "correio_eletronico" TEXT,

    CONSTRAINT "Estabelecimento_pkey" PRIMARY KEY ("cnpj_basico","cnpj_ordem")
);

-- CreateTable
CREATE TABLE "Socio" (
    "id" SERIAL NOT NULL,
    "cnpj_basico" VARCHAR(8) NOT NULL,
    "identificador_socio" VARCHAR(1),
    "nome_socio" TEXT NOT NULL,
    "cpf_cnpj_socio" VARCHAR(14),
    "qualificacao_socio" VARCHAR(2),
    "data_entrada_sociedade" DATE,
    "faixa_etaria" VARCHAR(1),

    CONSTRAINT "Socio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cnae_descricao_idx" ON "Cnae"("descricao");

-- CreateIndex
CREATE INDEX "Empresa_razao_social_idx" ON "Empresa"("razao_social");

-- CreateIndex
CREATE UNIQUE INDEX "Estabelecimento_cnpj_completo_key" ON "Estabelecimento"("cnpj_completo");

-- CreateIndex
CREATE INDEX "Estabelecimento_cnae_fiscal_principal_idx" ON "Estabelecimento"("cnae_fiscal_principal");

-- CreateIndex
CREATE INDEX "Estabelecimento_uf_idx" ON "Estabelecimento"("uf");

-- CreateIndex
CREATE INDEX "Estabelecimento_situacao_cadastral_idx" ON "Estabelecimento"("situacao_cadastral");

-- CreateIndex
CREATE INDEX "Socio_cnpj_basico_idx" ON "Socio"("cnpj_basico");

-- CreateIndex
CREATE INDEX "Socio_nome_socio_idx" ON "Socio"("nome_socio");

-- AddForeignKey
ALTER TABLE "Empresa" ADD CONSTRAINT "Empresa_natureza_juridica_cod_fkey" FOREIGN KEY ("natureza_juridica_cod") REFERENCES "NaturezaJuridica"("codigo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estabelecimento" ADD CONSTRAINT "Estabelecimento_cnpj_basico_fkey" FOREIGN KEY ("cnpj_basico") REFERENCES "Empresa"("cnpj_basico") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estabelecimento" ADD CONSTRAINT "Estabelecimento_cnae_fiscal_principal_fkey" FOREIGN KEY ("cnae_fiscal_principal") REFERENCES "Cnae"("codigo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estabelecimento" ADD CONSTRAINT "Estabelecimento_municipio_cod_fkey" FOREIGN KEY ("municipio_cod") REFERENCES "Municipio"("codigo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Socio" ADD CONSTRAINT "Socio_cnpj_basico_fkey" FOREIGN KEY ("cnpj_basico") REFERENCES "Empresa"("cnpj_basico") ON DELETE RESTRICT ON UPDATE CASCADE;

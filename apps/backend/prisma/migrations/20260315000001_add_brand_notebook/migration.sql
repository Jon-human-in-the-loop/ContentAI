-- CreateTable
CREATE TABLE "brand_notebook_entries" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "category" VARCHAR(50) NOT NULL DEFAULT 'general',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_notebook_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "brand_notebook_entries_client_id_category_idx" ON "brand_notebook_entries"("client_id", "category");

-- AddForeignKey
ALTER TABLE "brand_notebook_entries" ADD CONSTRAINT "brand_notebook_entries_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

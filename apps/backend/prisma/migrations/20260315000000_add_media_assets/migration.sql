-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "client_id" UUID,
    "content_piece_id" UUID,
    "file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "s3_key" VARCHAR(500) NOT NULL,
    "url" VARCHAR(1000),
    "source" VARCHAR(50) NOT NULL DEFAULT 'upload',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_assets_org_id_client_id_idx" ON "media_assets"("org_id", "client_id");

-- CreateIndex
CREATE INDEX "media_assets_content_piece_id_idx" ON "media_assets"("content_piece_id");

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_content_piece_id_fkey" FOREIGN KEY ("content_piece_id") REFERENCES "content_pieces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

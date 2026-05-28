-- CreateTable
CREATE TABLE "GuideCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuideCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guide" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "categoryId" TEXT NOT NULL,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuideCategory_slug_key" ON "GuideCategory"("slug");

-- CreateIndex
CREATE INDEX "GuideCategory_sortOrder_idx" ON "GuideCategory"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Guide_slug_key" ON "Guide"("slug");

-- CreateIndex
CREATE INDEX "Guide_categoryId_idx" ON "Guide"("categoryId");

-- CreateIndex
CREATE INDEX "Guide_published_idx" ON "Guide"("published");

-- CreateIndex
CREATE INDEX "Guide_createdAt_idx" ON "Guide"("createdAt");

-- AddForeignKey
ALTER TABLE "Guide" ADD CONSTRAINT "Guide_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "GuideCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guide" ADD CONSTRAINT "Guide_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

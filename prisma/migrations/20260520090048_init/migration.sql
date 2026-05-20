-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 1,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'untested',
    "statusNote" TEXT,
    "lastTested" DATETIME,
    "lastScanned" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Source_url_key" ON "Source"("url");

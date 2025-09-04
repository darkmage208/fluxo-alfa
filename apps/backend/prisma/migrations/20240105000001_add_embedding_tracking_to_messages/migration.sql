-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN     "tokens_embedding" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "chat_messages" ADD COLUMN     "embedding_cost_usd" DECIMAL(10,6) NOT NULL DEFAULT 0;
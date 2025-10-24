-- CreateTable
CREATE TABLE "pending_user_payments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" TEXT NOT NULL,
    "name" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "payment_method" TEXT NOT NULL,
    "gateway_data" JSONB,
    "expiration_date" TIMESTAMP(3) NOT NULL,
    "is_processed" BOOLEAN NOT NULL DEFAULT false,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_user_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pending_user_payments_email_key" ON "pending_user_payments"("email");

-- CreateIndex
CREATE INDEX "pending_user_payments_email_idx" ON "pending_user_payments"("email");

-- CreateIndex
CREATE INDEX "pending_user_payments_is_processed_idx" ON "pending_user_payments"("is_processed");

-- CreateIndex
CREATE INDEX "pending_user_payments_expiration_date_idx" ON "pending_user_payments"("expiration_date");

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCustomerAuditLogsTable1700000000001 implements MigrationInterface {
  name = 'CreateCustomerAuditLogsTable1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "customer_audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "customer_id" uuid,
        "customer_name" character varying(255),
        "customer_email" character varying(255),
        "action" character varying NOT NULL,
        "status" character varying NOT NULL DEFAULT 'success',
        "transaction_id" uuid,
        "metadata" jsonb,
        "ip_address" character varying(45),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_customer_audit_logs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_customer_audit_logs_customer_id" ON "customer_audit_logs" ("customer_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_customer_audit_logs_action" ON "customer_audit_logs" ("action") `);
    await queryRunner.query(`CREATE INDEX "IDX_customer_audit_logs_status" ON "customer_audit_logs" ("status") `);
    await queryRunner.query(`CREATE INDEX "IDX_customer_audit_logs_transaction_id" ON "customer_audit_logs" ("transaction_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_customer_audit_logs_created_at" ON "customer_audit_logs" ("created_at") `);
    await queryRunner.query(`
      ALTER TABLE "customer_audit_logs"
      ADD CONSTRAINT "FK_customer_audit_logs_transaction_id"
      FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "customer_audit_logs" DROP CONSTRAINT "FK_customer_audit_logs_transaction_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_customer_audit_logs_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_customer_audit_logs_transaction_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_customer_audit_logs_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_customer_audit_logs_action"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_customer_audit_logs_customer_id"`);
    await queryRunner.query(`DROP TABLE "customer_audit_logs"`);
  }
}

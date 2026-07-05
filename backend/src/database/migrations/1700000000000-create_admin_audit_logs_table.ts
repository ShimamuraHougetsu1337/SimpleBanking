import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdminAuditLogsTable1700000000000 implements MigrationInterface {
  name = 'CreateAdminAuditLogsTable1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "admin_audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "admin_id" uuid,
        "admin_name" character varying(255),
        "admin_email" character varying(255),
        "action" character varying NOT NULL,
        "status" character varying NOT NULL DEFAULT 'success',
        "target_id" uuid,
        "target_label" character varying(255),
        "metadata" jsonb,
        "ip_address" character varying(45),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_audit_logs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_admin_audit_logs_admin_id" ON "admin_audit_logs" ("admin_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_admin_audit_logs_action" ON "admin_audit_logs" ("action") `);
    await queryRunner.query(`CREATE INDEX "IDX_admin_audit_logs_status" ON "admin_audit_logs" ("status") `);
    await queryRunner.query(`CREATE INDEX "IDX_admin_audit_logs_created_at" ON "admin_audit_logs" ("created_at") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_admin_audit_logs_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_admin_audit_logs_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_admin_audit_logs_action"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_admin_audit_logs_admin_id"`);
    await queryRunner.query(`DROP TABLE "admin_audit_logs"`);
  }
}

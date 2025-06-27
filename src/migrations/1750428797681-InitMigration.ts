import { MigrationInterface, QueryRunner } from "typeorm";

export class InitMigration1750428797681 implements MigrationInterface {
    name = 'InitMigration1750428797681'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_provider_enum') THEN
                CREATE TYPE "public"."user_provider_enum" AS ENUM ('local', 'google');
              END IF;
            END
            $$;
`);

        // await queryRunner.query(`ALTER TABLE "user" ADD "provider" "public"."user_provider_enum" NOT NULL DEFAULT 'local'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "provider"`);
        await queryRunner.query(`DROP TYPE "public"."user_provider_enum"`);
    }

}

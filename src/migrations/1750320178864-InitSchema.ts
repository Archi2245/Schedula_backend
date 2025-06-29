import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1750320178864 implements MigrationInterface {
    name = 'InitSchema1750320178864'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patient" ALTER COLUMN "phone_number" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "patient" ALTER COLUMN "gender" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "patient" DROP COLUMN "dob"`);
        await queryRunner.query(`ALTER TABLE "patient" ADD "dob" date`);
        await queryRunner.query(`ALTER TABLE "patient" ALTER COLUMN "patient_address" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "patient" ALTER COLUMN "emergency_contact" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "patient" DROP COLUMN "medical_history"`);
        await queryRunner.query(`ALTER TABLE "patient" ADD "medical_history" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patient" DROP COLUMN "medical_history"`);
        await queryRunner.query(`ALTER TABLE "patient" ADD "medical_history" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "patient" ALTER COLUMN "emergency_contact" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "patient" ALTER COLUMN "patient_address" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "patient" DROP COLUMN "dob"`);
        await queryRunner.query(`ALTER TABLE "patient" ADD "dob" TIMESTAMP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "patient" ALTER COLUMN "gender" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "patient" ALTER COLUMN "phone_number" SET NOT NULL`);
    }

}

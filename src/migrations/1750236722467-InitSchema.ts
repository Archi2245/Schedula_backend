import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1750236722467 implements MigrationInterface {
    name = 'InitSchema1750236722467'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "doctor" ALTER COLUMN "phoneNumber" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor" ALTER COLUMN "specialization" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor" ALTER COLUMN "experience_years" SET DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "education"`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD "education" text`);
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "clinic_name"`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD "clinic_name" text`);
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "clinic_address"`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD "clinic_address" text`);
        await queryRunner.query(`ALTER TABLE "doctor" ALTER COLUMN "available_days" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor" ALTER COLUMN "available_time_slots" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor" ALTER COLUMN "hashed_refresh_token" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "doctor" ALTER COLUMN "hashed_refresh_token" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor" ALTER COLUMN "available_time_slots" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor" ALTER COLUMN "available_days" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "clinic_address"`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD "clinic_address" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "clinic_name"`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD "clinic_name" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "education"`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD "education" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor" ALTER COLUMN "experience_years" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "doctor" ALTER COLUMN "specialization" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor" ALTER COLUMN "phoneNumber" SET NOT NULL`);
    }

}

import { MigrationInterface, QueryRunner } from "typeorm";

export class Addnulls1752074788938 implements MigrationInterface {
    name = 'Addnulls1752074788938'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "booking_start_time" TIMESTAMP NOT NULL DEFAULT NOW()`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "booking_end_time" TIMESTAMP NOT NULL DEFAULT NOW()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "booking_end_time"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "booking_start_time"`);
    }

}

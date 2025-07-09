import { MigrationInterface, QueryRunner } from "typeorm";

export class InitMigration1752066567545 implements MigrationInterface {
    name = 'InitMigration1752066567545'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "booking_start_time" TIMESTAMP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "booking_end_time" TIMESTAMP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "booking_end_time"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "booking_start_time"`);
    }

}

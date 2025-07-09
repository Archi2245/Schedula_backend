import { MigrationInterface, QueryRunner } from "typeorm";

export class Newmigration1752087825006 implements MigrationInterface {
    name = 'Newmigration1752087825006'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "booking_end_time"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "slot_bookings"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "current_bookings"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "is_fully_booked"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "booking_start_time"`);
        await queryRunner.query(`ALTER TABLE "time_slot" ADD "slot_status" character varying NOT NULL DEFAULT 'active'`);
        await queryRunner.query(`ALTER TABLE "time_slot" ADD "booking_start_time" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "time_slot" ADD "booking_end_time" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "time_slot" DROP COLUMN "booking_end_time"`);
        await queryRunner.query(`ALTER TABLE "time_slot" DROP COLUMN "booking_start_time"`);
        await queryRunner.query(`ALTER TABLE "time_slot" DROP COLUMN "slot_status"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "booking_start_time" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "is_fully_booked" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "current_bookings" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "slot_bookings" json DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "booking_end_time" TIMESTAMP NOT NULL DEFAULT now()`);
    }

}

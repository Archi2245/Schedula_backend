import { MigrationInterface, QueryRunner } from "typeorm";

export class InitMigration1751619822478 implements MigrationInterface {
    name = 'InitMigration1751619822478'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "time_slots"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "max_patients_per_slot"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "end_time"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "booked_slots"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "start_time"`);
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "slot_duration"`);
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "patients_per_slot"`);
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "consulting_time_per_patient"`);
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "is_configuration_valid"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "consulting_start_time" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "consulting_end_time" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "booking_start_time" TIMESTAMP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "booking_end_time" TIMESTAMP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "patients_per_slot" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "slot_duration_minutes" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "reporting_interval_minutes" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "current_bookings" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "is_fully_booked" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`CREATE TYPE "public"."doctor_availability_slot_status_enum" AS ENUM('active', 'cancelled', 'completed')`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "slot_status" "public"."doctor_availability_slot_status_enum" NOT NULL DEFAULT 'active'`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD "default_consulting_time_per_patient" integer NOT NULL DEFAULT '10'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "default_consulting_time_per_patient"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "slot_status"`);
        await queryRunner.query(`DROP TYPE "public"."doctor_availability_slot_status_enum"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "is_fully_booked"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "current_bookings"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "reporting_interval_minutes"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "slot_duration_minutes"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "patients_per_slot"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "booking_end_time"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "booking_start_time"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "consulting_end_time"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "consulting_start_time"`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD "is_configuration_valid" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD "consulting_time_per_patient" integer NOT NULL DEFAULT '10'`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD "patients_per_slot" integer NOT NULL DEFAULT '3'`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD "slot_duration" integer NOT NULL DEFAULT '30'`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "start_time" character varying`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "booked_slots" text array`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "end_time" character varying`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "max_patients_per_slot" integer NOT NULL DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "time_slots" json NOT NULL DEFAULT '[]'`);
    }

}

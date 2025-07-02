import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDoctorSchedulingColumns1751480945307 implements MigrationInterface {
    name = 'AddDoctorSchedulingColumns1751480945307'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "appointment_date"`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "time_slot"`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "scheduled_on" TIMESTAMP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "weekday" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "session" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "duration_minutes" integer NOT NULL DEFAULT '15'`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "slot_position" integer`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "reporting_time" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "time_interval_minutes" integer`);
        await queryRunner.query(`CREATE TYPE "public"."doctor_schedule_type_enum" AS ENUM('stream', 'wave')`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD "schedule_type" "public"."doctor_schedule_type_enum" NOT NULL DEFAULT 'wave'`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD "slot_duration" integer NOT NULL DEFAULT '15'`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD "patients_per_slot" integer NOT NULL DEFAULT '3'`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD "consulting_time_per_patient" integer NOT NULL DEFAULT '10'`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "slot_bookings" json NOT NULL DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "max_patients_per_slot" integer NOT NULL DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "appointment_status"`);
        await queryRunner.query(`CREATE TYPE "public"."appointment_appointment_status_enum" AS ENUM('pending', 'confirmed', 'cancelled', 'completed')`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "appointment_status" "public"."appointment_appointment_status_enum" NOT NULL DEFAULT 'confirmed'`);
        await queryRunner.query(`ALTER TABLE "appointment" ALTER COLUMN "reason" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "appointment" ALTER COLUMN "notes" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "date"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "date" date NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "booked_slots"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "booked_slots" text array NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "time_slots"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "time_slots" json NOT NULL DEFAULT '[]'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "time_slots"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "time_slots" text NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "booked_slots"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "booked_slots" text NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "date"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "date" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "appointment" ALTER COLUMN "notes" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "appointment" ALTER COLUMN "reason" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "appointment_status"`);
        await queryRunner.query(`DROP TYPE "public"."appointment_appointment_status_enum"`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "appointment_status" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "max_patients_per_slot"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "slot_bookings"`);
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "consulting_time_per_patient"`);
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "patients_per_slot"`);
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "slot_duration"`);
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "schedule_type"`);
        await queryRunner.query(`DROP TYPE "public"."doctor_schedule_type_enum"`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "time_interval_minutes"`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "reporting_time"`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "slot_position"`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "duration_minutes"`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "session"`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "weekday"`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "scheduled_on"`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "time_slot" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "appointment_date" TIMESTAMP NOT NULL`);
    }

}

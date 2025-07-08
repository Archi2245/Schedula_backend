import { MigrationInterface, QueryRunner } from "typeorm";

export class InitMigration1751979145965 implements MigrationInterface {
    name = 'InitMigration1751979145965'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "appointment" DROP CONSTRAINT "FK_9f9596ccb3fe8e63358d9bfcbdb"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "booking_start_time"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "booking_end_time"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "patients_per_slot"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "slot_duration_minutes"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "reporting_interval_minutes"`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "slot_id"`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "session"`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "weekday"`);
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "available_days"`);
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "available_time_slots"`);
        await queryRunner.query(`ALTER TABLE "time_slot" ADD "date" date NOT NULL`);
        await queryRunner.query(`ALTER TABLE "time_slot" ADD "patients_per_slot" integer NOT NULL DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "time_slot" ADD "slot_duration_minutes" integer NOT NULL DEFAULT '30'`);
        await queryRunner.query(`ALTER TABLE "time_slot" ADD "is_fully_booked" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "time_slot" ADD "slot_bookings" json DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "time_slot" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "time_slot" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "time_slot" ADD "current_bookings" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "time_slot" ADD "availabilityId" integer`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "timeSlotSlotId" integer`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "slot_status"`);
        await queryRunner.query(`DROP TYPE "public"."doctor_availability_slot_status_enum"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "slot_status" character varying NOT NULL DEFAULT 'active'`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ALTER COLUMN "current_bookings" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ALTER COLUMN "is_fully_booked" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "time_slot" ADD CONSTRAINT "FK_542a1ffef03df66c2b5fd9226cb" FOREIGN KEY ("availabilityId") REFERENCES "doctor_availability"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD CONSTRAINT "FK_3467f1cadb6225a9b82a38b4950" FOREIGN KEY ("timeSlotSlotId") REFERENCES "time_slot"("slot_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "appointment" DROP CONSTRAINT "FK_3467f1cadb6225a9b82a38b4950"`);
        await queryRunner.query(`ALTER TABLE "time_slot" DROP CONSTRAINT "FK_542a1ffef03df66c2b5fd9226cb"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ALTER COLUMN "is_fully_booked" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ALTER COLUMN "current_bookings" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "slot_status"`);
        await queryRunner.query(`CREATE TYPE "public"."doctor_availability_slot_status_enum" AS ENUM('active', 'cancelled', 'completed')`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "slot_status" "public"."doctor_availability_slot_status_enum" DEFAULT 'active'`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "timeSlotSlotId"`);
        await queryRunner.query(`ALTER TABLE "time_slot" DROP COLUMN "availabilityId"`);
        await queryRunner.query(`ALTER TABLE "time_slot" DROP COLUMN "current_bookings"`);
        await queryRunner.query(`ALTER TABLE "time_slot" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "time_slot" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "time_slot" DROP COLUMN "slot_bookings"`);
        await queryRunner.query(`ALTER TABLE "time_slot" DROP COLUMN "is_fully_booked"`);
        await queryRunner.query(`ALTER TABLE "time_slot" DROP COLUMN "slot_duration_minutes"`);
        await queryRunner.query(`ALTER TABLE "time_slot" DROP COLUMN "patients_per_slot"`);
        await queryRunner.query(`ALTER TABLE "time_slot" DROP COLUMN "date"`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD "available_time_slots" character varying`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD "available_days" character varying`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "weekday" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "session" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "slot_id" integer`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "reporting_interval_minutes" integer DEFAULT '60'`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "slot_duration_minutes" integer DEFAULT '60'`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "patients_per_slot" integer DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "booking_end_time" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "booking_start_time" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD CONSTRAINT "FK_9f9596ccb3fe8e63358d9bfcbdb" FOREIGN KEY ("slot_id") REFERENCES "doctor_availability"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}

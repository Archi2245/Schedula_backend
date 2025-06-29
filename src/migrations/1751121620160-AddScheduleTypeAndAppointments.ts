import { MigrationInterface, QueryRunner } from "typeorm";

export class AddScheduleTypeAndAppointments1751121620160 implements MigrationInterface {
    name = 'AddScheduleTypeAndAppointments1751121620160'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP CONSTRAINT "FK_35e27c4696d7477f55ef80aacaf"`);
        await queryRunner.query(`CREATE TABLE "timeslot" ("slot_id" SERIAL NOT NULL, "slot_date" date NOT NULL, "slot_time" TIME NOT NULL, "is_available" boolean NOT NULL DEFAULT true, "session" character varying, "doctor_id" integer, "availability_id" integer, CONSTRAINT "PK_ba5086a67e97aa8286cca6e09e8" PRIMARY KEY ("slot_id"))`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "time_slot"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "time_slots"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "booked_slots"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "doctorDoctorId"`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "weekday" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "session" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "start_time" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "end_time" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "time_slots" text NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "booked_slots" text NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "doctorDoctorId" integer`);
        await queryRunner.query(`CREATE TYPE "public"."doctor_schedule_type_enum" AS ENUM('stream', 'wave')`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD "schedule_type" "public"."doctor_schedule_type_enum" NOT NULL DEFAULT 'stream'`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "doctor_id" integer`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "appointment_date"`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "appointment_date" date NOT NULL`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "appointment_status"`);
        await queryRunner.query(`CREATE TYPE "public"."appointment_appointment_status_enum" AS ENUM('pending', 'confirmed', 'cancelled', 'completed')`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "appointment_status" "public"."appointment_appointment_status_enum" NOT NULL DEFAULT 'pending'`);
        await queryRunner.query(`ALTER TABLE "appointment" ALTER COLUMN "reason" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "appointment" ALTER COLUMN "notes" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "date"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "date" date NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "start_time"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "start_time" TIME NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "end_time"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "end_time" TIME NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ALTER COLUMN "session" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ALTER COLUMN "weekday" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD CONSTRAINT "FK_35e27c4696d7477f55ef80aacaf" FOREIGN KEY ("doctorDoctorId") REFERENCES "doctor"("doctor_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD CONSTRAINT "FK_2cc8d37cdcb4ecd1e726d6ed304" FOREIGN KEY ("doctor_id") REFERENCES "doctor"("doctor_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "timeslot" ADD CONSTRAINT "FK_6694587537d7ac723d6a9db6268" FOREIGN KEY ("doctor_id") REFERENCES "doctor"("doctor_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "timeslot" ADD CONSTRAINT "FK_80503ac837dd138ebd3a95fac92" FOREIGN KEY ("availability_id") REFERENCES "doctor_availability"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "timeslot" DROP CONSTRAINT "FK_80503ac837dd138ebd3a95fac92"`);
        await queryRunner.query(`ALTER TABLE "timeslot" DROP CONSTRAINT "FK_6694587537d7ac723d6a9db6268"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP CONSTRAINT "FK_2cc8d37cdcb4ecd1e726d6ed304"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP CONSTRAINT "FK_35e27c4696d7477f55ef80aacaf"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ALTER COLUMN "weekday" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ALTER COLUMN "session" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "end_time"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "end_time" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "start_time"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "start_time" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "date"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "date" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "appointment" ALTER COLUMN "notes" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "appointment" ALTER COLUMN "reason" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "appointment_status"`);
        await queryRunner.query(`DROP TYPE "public"."appointment_appointment_status_enum"`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "appointment_status" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "appointment_date"`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "appointment_date" TIMESTAMP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "doctor_id"`);
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "schedule_type"`);
        await queryRunner.query(`DROP TYPE "public"."doctor_schedule_type_enum"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "doctorDoctorId"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "booked_slots"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "time_slots"`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "end_time"`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "start_time"`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "session"`);
        await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN "weekday"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "doctorDoctorId" integer`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "booked_slots" text NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "time_slots" text NOT NULL`);
        await queryRunner.query(`ALTER TABLE "appointment" ADD "time_slot" character varying NOT NULL`);
        await queryRunner.query(`DROP TABLE "timeslot"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD CONSTRAINT "FK_35e27c4696d7477f55ef80aacaf" FOREIGN KEY ("doctorDoctorId") REFERENCES "doctor"("doctor_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}

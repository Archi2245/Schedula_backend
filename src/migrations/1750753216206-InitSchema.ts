import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1750753216206 implements MigrationInterface {
    name = 'InitSchema1750753216206'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "timeslot" DROP CONSTRAINT "FK_eaa3f0dd76ee855e08c8c1b2a14"`);
        await queryRunner.query(`CREATE TABLE "doctor_availability" ("id" SERIAL NOT NULL, "date" date NOT NULL, "start_time" TIME NOT NULL, "end_time" TIME NOT NULL, "session" character varying, "weekday" character varying, "doctor_id" integer, CONSTRAINT "PK_3d2b4ffe9085f8c7f9f269aed89" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "timeslot" DROP COLUMN "day_of_week"`);
        await queryRunner.query(`ALTER TABLE "timeslot" DROP COLUMN "start_time"`);
        await queryRunner.query(`ALTER TABLE "timeslot" DROP COLUMN "end_time"`);
        await queryRunner.query(`ALTER TABLE "timeslot" DROP COLUMN "doctorDoctorId"`);
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "available_days"`);
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "available_time_slots"`);
        await queryRunner.query(`ALTER TABLE "timeslot" ADD "slot_date" date NOT NULL`);
        await queryRunner.query(`ALTER TABLE "timeslot" ADD "slot_time" TIME NOT NULL`);
        await queryRunner.query(`ALTER TABLE "timeslot" ADD "is_available" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "timeslot" ADD "session" character varying`);
        await queryRunner.query(`ALTER TABLE "timeslot" ADD "doctor_id" integer`);
        await queryRunner.query(`ALTER TABLE "timeslot" ADD "availability_id" integer`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD CONSTRAINT "FK_2cc8d37cdcb4ecd1e726d6ed304" FOREIGN KEY ("doctor_id") REFERENCES "doctor"("doctor_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "timeslot" ADD CONSTRAINT "FK_6694587537d7ac723d6a9db6268" FOREIGN KEY ("doctor_id") REFERENCES "doctor"("doctor_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "timeslot" ADD CONSTRAINT "FK_80503ac837dd138ebd3a95fac92" FOREIGN KEY ("availability_id") REFERENCES "doctor_availability"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "timeslot" DROP CONSTRAINT "FK_80503ac837dd138ebd3a95fac92"`);
        await queryRunner.query(`ALTER TABLE "timeslot" DROP CONSTRAINT "FK_6694587537d7ac723d6a9db6268"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP CONSTRAINT "FK_2cc8d37cdcb4ecd1e726d6ed304"`);
        await queryRunner.query(`ALTER TABLE "timeslot" DROP COLUMN "availability_id"`);
        await queryRunner.query(`ALTER TABLE "timeslot" DROP COLUMN "doctor_id"`);
        await queryRunner.query(`ALTER TABLE "timeslot" DROP COLUMN "session"`);
        await queryRunner.query(`ALTER TABLE "timeslot" DROP COLUMN "is_available"`);
        await queryRunner.query(`ALTER TABLE "timeslot" DROP COLUMN "slot_time"`);
        await queryRunner.query(`ALTER TABLE "timeslot" DROP COLUMN "slot_date"`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD "available_time_slots" character varying`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD "available_days" character varying`);
        await queryRunner.query(`ALTER TABLE "timeslot" ADD "doctorDoctorId" integer`);
        await queryRunner.query(`ALTER TABLE "timeslot" ADD "end_time" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "timeslot" ADD "start_time" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "timeslot" ADD "day_of_week" character varying NOT NULL`);
        await queryRunner.query(`DROP TABLE "doctor_availability"`);
        await queryRunner.query(`ALTER TABLE "timeslot" ADD CONSTRAINT "FK_eaa3f0dd76ee855e08c8c1b2a14" FOREIGN KEY ("doctorDoctorId") REFERENCES "doctor"("doctor_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}

import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSlotBookingsColumn1751518104253 implements MigrationInterface {
    name = 'AddSlotBookingsColumn1751518104253'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP CONSTRAINT "FK_2cc8d37cdcb4ecd1e726d6ed304"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP CONSTRAINT "FK_35e27c4696d7477f55ef80aacaf"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "doctor_id"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "doctorDoctorId"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "booked_slots"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "time_slots"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "time_slots" text NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "booked_slots" text NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "doctorDoctorId" integer`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "doctor_id" integer`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "date"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "date" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "start_time"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "start_time" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "end_time"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "end_time" character varying NOT NULL`);
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
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
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
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "end_time"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "end_time" TIME NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "start_time"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "start_time" TIME NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "date"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "date" date NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "doctor_id"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "doctorDoctorId"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "booked_slots"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "time_slots"`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "time_slots" text NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "booked_slots" text NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "doctorDoctorId" integer`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD "doctor_id" integer`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD CONSTRAINT "FK_35e27c4696d7477f55ef80aacaf" FOREIGN KEY ("doctorDoctorId") REFERENCES "doctor"("doctor_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "doctor_availability" ADD CONSTRAINT "FK_2cc8d37cdcb4ecd1e726d6ed304" FOREIGN KEY ("doctor_id") REFERENCES "doctor"("doctor_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}

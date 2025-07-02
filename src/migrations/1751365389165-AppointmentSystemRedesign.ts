import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1751365389165 implements MigrationInterface  {
  

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ======== Appointment Table Updates ========
    await queryRunner.query(`
      ALTER TABLE "appointment" 
        ADD "scheduled_on" TIMESTAMP NOT NULL,
        ADD "weekday" VARCHAR NOT NULL,
        ADD "session" VARCHAR NOT NULL,
        ADD "duration_minutes" INTEGER DEFAULT 15,
        ADD "slot_position" INTEGER,
        ADD "appointment_status" VARCHAR DEFAULT 'confirmed',
        ADD "reason" TEXT,
        ADD "notes" TEXT,
        ADD "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()
    `);

    // ======== DoctorAvailability Table Updates ========
    await queryRunner.query(`
      ALTER TABLE "doctor_availability" 
        ADD "time_slots" JSON DEFAULT '[]',
        ADD "slot_bookings" JSON DEFAULT '{}',
        ADD "max_patients_per_slot" INTEGER DEFAULT 1,
        ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ======== Revert DoctorAvailability Table ========
    await queryRunner.query(`
      ALTER TABLE "doctor_availability" 
        DROP COLUMN "time_slots",
        DROP COLUMN "slot_bookings",
        DROP COLUMN "max_patients_per_slot",
        DROP COLUMN "created_at"
    `);

    // ======== Revert Appointment Table ========
    await queryRunner.query(`
      ALTER TABLE "appointment" 
        DROP COLUMN "scheduled_on",
        DROP COLUMN "weekday",
        DROP COLUMN "session",
        DROP COLUMN "duration_minutes",
        DROP COLUMN "slot_position",
        DROP COLUMN "appointment_status",
        DROP COLUMN "reason",
        DROP COLUMN "notes",
        DROP COLUMN "created_at",
        DROP COLUMN "updated_at"
    `);
  }
}

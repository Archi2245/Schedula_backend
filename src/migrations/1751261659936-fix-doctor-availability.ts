// Create a new migration file: src/migrations/YYYYMMDDHHMMSS-fix-doctor-availability.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixDoctorAvailability1234567890123 implements MigrationInterface {
  name = 'FixDoctorAvailability1234567890123';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the problematic columns if they exist
    await queryRunner.query(`
      DO $$ 
      BEGIN 
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'doctor_availability' AND column_name = 'time_slots') THEN
          ALTER TABLE "doctor_availability" DROP COLUMN "time_slots";
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ 
      BEGIN 
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'doctor_availability' AND column_name = 'booked_slots') THEN
          ALTER TABLE "doctor_availability" DROP COLUMN "booked_slots";
        END IF;
      END $$;
    `);

    // Add the columns with correct types
    await queryRunner.query(`
      ALTER TABLE "doctor_availability" 
      ADD COLUMN "time_slots" jsonb DEFAULT '[]'::jsonb
    `);

    await queryRunner.query(`
      ALTER TABLE "doctor_availability" 
      ADD COLUMN "booked_slots" jsonb DEFAULT '[]'::jsonb
    `);

    // Make sure date column is not nullable
    await queryRunner.query(`
      ALTER TABLE "doctor_availability" 
      ALTER COLUMN "date" SET NOT NULL
    `);

    // Update session column to use enum if not already
    await queryRunner.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'doctor_availability_session_enum') THEN
          CREATE TYPE "doctor_availability_session_enum" AS ENUM('morning', 'evening');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "doctor_availability" 
      ALTER COLUMN "session" TYPE "doctor_availability_session_enum" 
      USING "session"::"doctor_availability_session_enum"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse the changes
    await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "time_slots"`);
    await queryRunner.query(`ALTER TABLE "doctor_availability" DROP COLUMN "booked_slots"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "doctor_availability_session_enum"`);
  }
}
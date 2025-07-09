import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixAvailabilityBookingTimes1689200012345 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add columns (if not already added)
    await queryRunner.query(`
      ALTER TABLE doctor_availability
      ADD COLUMN IF NOT EXISTS booking_start_time TIMESTAMP,
      ADD COLUMN IF NOT EXISTS booking_end_time TIMESTAMP
    `);

    // 2. Patch existing NULL values
    await queryRunner.query(`
      UPDATE doctor_availability
      SET booking_start_time = NOW() - INTERVAL '1 HOUR',
          booking_end_time = NOW() + INTERVAL '1 HOUR'
      WHERE booking_start_time IS NULL OR booking_end_time IS NULL
    `);

    // 3. Add NOT NULL constraints
    await queryRunner.query(`
      ALTER TABLE doctor_availability
      ALTER COLUMN booking_start_time SET NOT NULL,
      ALTER COLUMN booking_end_time SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE doctor_availability
      ALTER COLUMN booking_start_time DROP NOT NULL,
      ALTER COLUMN booking_end_time DROP NOT NULL
    `);
  }
}

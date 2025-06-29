import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1750243060407 implements MigrationInterface {
    name = 'InitSchema1750243060407'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "hashed_refresh_token"`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD "hashed_refresh_token" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "hashed_refresh_token"`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD "hashed_refresh_token" character varying`);
    }

}

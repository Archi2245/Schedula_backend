import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1750236417960 implements MigrationInterface {
    name = 'InitSchema1750236417960'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "doctor" ADD "password" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD "hashed_refresh_token" character varying NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "hashed_refresh_token"`);
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "password"`);
    }

}

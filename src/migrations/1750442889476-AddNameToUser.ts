import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNameToUser1750442889476 implements MigrationInterface {
    name = 'AddNameToUser1750442889476'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "name" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "name"`);
    }

}

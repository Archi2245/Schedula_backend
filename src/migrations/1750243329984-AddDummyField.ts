import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDummyField1750243329984 implements MigrationInterface {
    name = 'AddDummyField1750243329984'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patient" ADD "dummyField" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patient" DROP COLUMN "dummyField"`);
    }

}

import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1750318907208 implements MigrationInterface {
    name = 'InitSchema1750318907208'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."user_role_enum" AS ENUM('doctor', 'patient')`);
        await queryRunner.query(`CREATE TABLE "user" ("user_id" SERIAL NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "role" "public"."user_role_enum" NOT NULL DEFAULT 'patient', "hashed_refresh_token" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_758b8ce7c18b9d347461b30228d" PRIMARY KEY ("user_id"))`);
        await queryRunner.query(`ALTER TABLE "patient" DROP CONSTRAINT "UQ_2c56e61f9e1afb07f28882fcebb"`);
        await queryRunner.query(`ALTER TABLE "patient" DROP COLUMN "email"`);
        await queryRunner.query(`ALTER TABLE "patient" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "patient" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "doctor" DROP CONSTRAINT "UQ_bf6303ac911efaab681dc911f54"`);
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "email"`);
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "password"`);
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "hashed_refresh_token"`);
        await queryRunner.query(`ALTER TABLE "patient" ADD "user_id" integer`);
        await queryRunner.query(`ALTER TABLE "patient" ADD CONSTRAINT "UQ_f20f0bf6b734938c710e12c2782" UNIQUE ("user_id")`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD "user_id" integer`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD CONSTRAINT "UQ_a685e79dc974f768c39e5d12281" UNIQUE ("user_id")`);
        await queryRunner.query(`ALTER TABLE "patient" ADD CONSTRAINT "FK_f20f0bf6b734938c710e12c2782" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD CONSTRAINT "FK_a685e79dc974f768c39e5d12281" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "doctor" DROP CONSTRAINT "FK_a685e79dc974f768c39e5d12281"`);
        await queryRunner.query(`ALTER TABLE "patient" DROP CONSTRAINT "FK_f20f0bf6b734938c710e12c2782"`);
        await queryRunner.query(`ALTER TABLE "doctor" DROP CONSTRAINT "UQ_a685e79dc974f768c39e5d12281"`);
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "user_id"`);
        await queryRunner.query(`ALTER TABLE "patient" DROP CONSTRAINT "UQ_f20f0bf6b734938c710e12c2782"`);
        await queryRunner.query(`ALTER TABLE "patient" DROP COLUMN "user_id"`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD "hashed_refresh_token" text`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD "password" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD "email" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctor" ADD CONSTRAINT "UQ_bf6303ac911efaab681dc911f54" UNIQUE ("email")`);
        await queryRunner.query(`ALTER TABLE "patient" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "patient" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "patient" ADD "email" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "patient" ADD CONSTRAINT "UQ_2c56e61f9e1afb07f28882fcebb" UNIQUE ("email")`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
    }

}

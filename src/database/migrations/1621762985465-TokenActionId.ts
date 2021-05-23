import {MigrationInterface, QueryRunner} from "typeorm";

export class TokenActionId1621762985465 implements MigrationInterface {
    name = 'TokenActionId1621762985465'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `tokens` ADD `auction_id` varchar(255) NULL");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `tokens` DROP COLUMN `auction_id`");
    }

}

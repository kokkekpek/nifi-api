import {MigrationInterface, QueryRunner} from "typeorm";

export class Creator1622467028517 implements MigrationInterface {
    name = 'Creator1622467028517'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `actions_create_token` ADD `creator` varchar(255) NOT NULL");
        await queryRunner.query("ALTER TABLE `tokens` ADD `creator` varchar(255) NOT NULL");
        await queryRunner.query("ALTER TABLE `auctions` CHANGE `finish_bid` `finish_bid` varchar(255) NULL");
        await queryRunner.query("ALTER TABLE `tokens` CHANGE `auction_id` `auction_id` varchar(255) NULL");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `tokens` CHANGE `auction_id` `auction_id` varchar(255) NULL DEFAULT 'NULL'");
        await queryRunner.query("ALTER TABLE `auctions` CHANGE `finish_bid` `finish_bid` varchar(255) NULL DEFAULT 'NULL'");
        await queryRunner.query("ALTER TABLE `tokens` DROP COLUMN `creator`");
        await queryRunner.query("ALTER TABLE `actions_create_token` DROP COLUMN `creator`");
    }

}

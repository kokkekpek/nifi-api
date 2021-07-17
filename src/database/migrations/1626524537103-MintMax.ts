import {MigrationInterface, QueryRunner} from "typeorm";

export class MintMax1626524537103 implements MigrationInterface {
    name = 'MintMax1626524537103'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `actions_mint_token` ADD `max` varchar(255) NOT NULL");
        await queryRunner.query("ALTER TABLE `auctions` CHANGE `finish_bid` `finish_bid` varchar(255) NULL");
        await queryRunner.query("ALTER TABLE `tokens` CHANGE `auction_id` `auction_id` varchar(255) NULL");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `tokens` CHANGE `auction_id` `auction_id` varchar(255) NULL DEFAULT 'NULL'");
        await queryRunner.query("ALTER TABLE `auctions` CHANGE `finish_bid` `finish_bid` varchar(255) NULL DEFAULT 'NULL'");
        await queryRunner.query("ALTER TABLE `actions_mint_token` DROP COLUMN `max`");
    }

}

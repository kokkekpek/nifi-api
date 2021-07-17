import {MigrationInterface, QueryRunner} from "typeorm";

export class MaximumNumberOfTokens1626355907177 implements MigrationInterface {
    name = 'MaximumNumberOfTokens1626355907177'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `tokens` ADD `maximum` varchar(255) NULL DEFAULT NULL");
        await queryRunner.query("ALTER TABLE `auctions` CHANGE `finish_bid` `finish_bid` varchar(255) NULL");
        await queryRunner.query("ALTER TABLE `tokens` CHANGE `auction_id` `auction_id` varchar(255) NULL");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `tokens` CHANGE `auction_id` `auction_id` varchar(255) NULL DEFAULT 'NULL'");
        await queryRunner.query("ALTER TABLE `auctions` CHANGE `finish_bid` `finish_bid` varchar(255) NULL DEFAULT 'NULL'");
        await queryRunner.query("ALTER TABLE `tokens` DROP COLUMN `maximum`");
    }

}

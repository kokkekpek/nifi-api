import {MigrationInterface, QueryRunner} from "typeorm";

export class TokenType1626355595451 implements MigrationInterface {
    name = 'TokenType1626355595451'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("CREATE TABLE `actions_mint_token` (`id` int NOT NULL AUTO_INCREMENT, `tokenId` varchar(255) NOT NULL, `address` varchar(255) NOT NULL, `user_public_key` varchar(255) NOT NULL, `owner` varchar(255) NOT NULL, `hash` varchar(255) NOT NULL, `time` varchar(255) NOT NULL, `creator` varchar(255) NOT NULL, INDEX `IDX_d7be17bb2e3f9d7cf3c33484a0` (`tokenId`), INDEX `IDX_d51caa3afa5a1266922b815e0a` (`user_public_key`), INDEX `IDX_f877f290e00ff211881d2b0783` (`owner`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("ALTER TABLE `tokens` ADD `type` varchar(15) NOT NULL DEFAULT 'art1'");
        await queryRunner.query("ALTER TABLE `auctions` CHANGE `finish_bid` `finish_bid` varchar(255) NULL");
        await queryRunner.query("ALTER TABLE `tokens` CHANGE `auction_id` `auction_id` varchar(255) NULL");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `tokens` CHANGE `auction_id` `auction_id` varchar(255) NULL DEFAULT 'NULL'");
        await queryRunner.query("ALTER TABLE `auctions` CHANGE `finish_bid` `finish_bid` varchar(255) NULL DEFAULT 'NULL'");
        await queryRunner.query("ALTER TABLE `tokens` DROP COLUMN `type`");
        await queryRunner.query("DROP INDEX `IDX_f877f290e00ff211881d2b0783` ON `actions_mint_token`");
        await queryRunner.query("DROP INDEX `IDX_d51caa3afa5a1266922b815e0a` ON `actions_mint_token`");
        await queryRunner.query("DROP INDEX `IDX_d7be17bb2e3f9d7cf3c33484a0` ON `actions_mint_token`");
        await queryRunner.query("DROP TABLE `actions_mint_token`");
    }

}

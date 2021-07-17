import {MigrationInterface, QueryRunner} from "typeorm";

export class Collections1626525513367 implements MigrationInterface {
    name = 'Collections1626525513367'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("CREATE TABLE `collections` (`id` int NOT NULL AUTO_INCREMENT, `tokenId` varchar(255) NOT NULL, `maximum` varchar(255) NULL, `address` varchar(255) NOT NULL, `name` varchar(255) NOT NULL, `symbol` varchar(255) NOT NULL, UNIQUE INDEX `IDX_2c37614d25ac37f19a116d7151` (`tokenId`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("ALTER TABLE `auctions` CHANGE `finish_bid` `finish_bid` varchar(255) NULL");
        await queryRunner.query("ALTER TABLE `tokens` CHANGE `auction_id` `auction_id` varchar(255) NULL");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `tokens` CHANGE `auction_id` `auction_id` varchar(255) NULL DEFAULT 'NULL'");
        await queryRunner.query("ALTER TABLE `auctions` CHANGE `finish_bid` `finish_bid` varchar(255) NULL DEFAULT 'NULL'");
        await queryRunner.query("DROP INDEX `IDX_2c37614d25ac37f19a116d7151` ON `collections`");
        await queryRunner.query("DROP TABLE `collections`");
    }

}

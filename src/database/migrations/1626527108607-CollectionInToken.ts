import {MigrationInterface, QueryRunner} from "typeorm";

export class CollectionInToken1626527108607 implements MigrationInterface {
    name = 'CollectionInToken1626527108607'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP INDEX `IDX_f4940ff249082f72f9877d3b24` ON `tokens`");
        await queryRunner.query("ALTER TABLE `tokens` ADD `collection` varchar(255) NOT NULL");
        await queryRunner.query("ALTER TABLE `auctions` CHANGE `finish_bid` `finish_bid` varchar(255) NULL");
        await queryRunner.query("ALTER TABLE `collections` CHANGE `maximum` `maximum` varchar(255) NULL");
        await queryRunner.query("ALTER TABLE `tokens` CHANGE `auction_id` `auction_id` varchar(255) NULL");
        await queryRunner.query("CREATE INDEX `IDX_f4940ff249082f72f9877d3b24` ON `tokens` (`tokenId`)");
        await queryRunner.query("CREATE INDEX `IDX_34eb3c25ef920350b64a76d2c8` ON `tokens` (`collection`)");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP INDEX `IDX_34eb3c25ef920350b64a76d2c8` ON `tokens`");
        await queryRunner.query("DROP INDEX `IDX_f4940ff249082f72f9877d3b24` ON `tokens`");
        await queryRunner.query("ALTER TABLE `tokens` CHANGE `auction_id` `auction_id` varchar(255) NULL DEFAULT 'NULL'");
        await queryRunner.query("ALTER TABLE `collections` CHANGE `maximum` `maximum` varchar(255) NULL DEFAULT 'NULL'");
        await queryRunner.query("ALTER TABLE `auctions` CHANGE `finish_bid` `finish_bid` varchar(255) NULL DEFAULT 'NULL'");
        await queryRunner.query("ALTER TABLE `tokens` DROP COLUMN `collection`");
        await queryRunner.query("CREATE UNIQUE INDEX `IDX_f4940ff249082f72f9877d3b24` ON `tokens` (`tokenId`)");
    }

}

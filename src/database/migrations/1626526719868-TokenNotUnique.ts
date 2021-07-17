import {MigrationInterface, QueryRunner} from "typeorm";

export class TokenNotUnique1626526719868 implements MigrationInterface {
    name = 'TokenNotUnique1626526719868'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP INDEX `IDX_f4940ff249082f72f9877d3b24` ON `tokens`");
        await queryRunner.query("ALTER TABLE `auctions` CHANGE `finish_bid` `finish_bid` varchar(255) NULL");
        await queryRunner.query("ALTER TABLE `collections` CHANGE `maximum` `maximum` varchar(255) NULL");
        await queryRunner.query("ALTER TABLE `tokens` CHANGE `auction_id` `auction_id` varchar(255) NULL");
        await queryRunner.query("CREATE INDEX `IDX_f4940ff249082f72f9877d3b24` ON `tokens` (`tokenId`)");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP INDEX `IDX_f4940ff249082f72f9877d3b24` ON `tokens`");
        await queryRunner.query("ALTER TABLE `tokens` CHANGE `auction_id` `auction_id` varchar(255) NULL DEFAULT 'NULL'");
        await queryRunner.query("ALTER TABLE `collections` CHANGE `maximum` `maximum` varchar(255) NULL DEFAULT 'NULL'");
        await queryRunner.query("ALTER TABLE `auctions` CHANGE `finish_bid` `finish_bid` varchar(255) NULL DEFAULT 'NULL'");
        await queryRunner.query("CREATE UNIQUE INDEX `IDX_f4940ff249082f72f9877d3b24` ON `tokens` (`tokenId`)");
    }

}

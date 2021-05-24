import {MigrationInterface, QueryRunner} from "typeorm";

export class AuctionLastMessageTime1621797506252 implements MigrationInterface {
    name = 'AuctionLastMessageTime1621797506252'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `auctions` ADD `last_message_time` int UNSIGNED NOT NULL");
        await queryRunner.query("CREATE INDEX `IDX_735d76435570c6eb18cadaf5d3` ON `auctions` (`address`)");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP INDEX `IDX_735d76435570c6eb18cadaf5d3` ON `auctions`");
        await queryRunner.query("ALTER TABLE `auctions` DROP COLUMN `last_message_time`");
    }

}

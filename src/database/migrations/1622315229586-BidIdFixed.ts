import {MigrationInterface, QueryRunner} from "typeorm";

export class BidIdFixed1622315229586 implements MigrationInterface {
    name = 'BidIdFixed1622315229586'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP INDEX `IDX_7729bc1896e2c415e5e4a5091a` ON `bids`");
        await queryRunner.query("ALTER TABLE `auctions` CHANGE `finish_bid` `finish_bid` varchar(255) NULL");
        await queryRunner.query("ALTER TABLE `tokens` CHANGE `auction_id` `auction_id` varchar(255) NULL");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `tokens` CHANGE `auction_id` `auction_id` varchar(255) NULL DEFAULT 'NULL'");
        await queryRunner.query("ALTER TABLE `auctions` CHANGE `finish_bid` `finish_bid` varchar(255) NULL DEFAULT 'NULL'");
        await queryRunner.query("CREATE UNIQUE INDEX `IDX_7729bc1896e2c415e5e4a5091a` ON `bids` (`bid_id`)");
    }

}

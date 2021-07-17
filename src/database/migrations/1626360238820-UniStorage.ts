import {MigrationInterface, QueryRunner} from "typeorm";

export class UniStorage1626360238820 implements MigrationInterface {
    name = 'UniStorage1626360238820'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("CREATE TABLE `uni_str` (`id` int NOT NULL AUTO_INCREMENT, `address` varchar(255) NOT NULL, `last_message_time` int UNSIGNED NOT NULL, INDEX `IDX_b4dced931ded5e7a038ba494d8` (`address`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("ALTER TABLE `auctions` CHANGE `finish_bid` `finish_bid` varchar(255) NULL");
        await queryRunner.query("ALTER TABLE `tokens` CHANGE `auction_id` `auction_id` varchar(255) NULL");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `tokens` CHANGE `auction_id` `auction_id` varchar(255) NULL DEFAULT 'NULL'");
        await queryRunner.query("ALTER TABLE `auctions` CHANGE `finish_bid` `finish_bid` varchar(255) NULL DEFAULT 'NULL'");
        await queryRunner.query("DROP INDEX `IDX_b4dced931ded5e7a038ba494d8` ON `uni_str`");
        await queryRunner.query("DROP TABLE `uni_str`");
    }

}

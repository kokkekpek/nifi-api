import {MigrationInterface, QueryRunner} from "typeorm";

export class Auctions1621764958649 implements MigrationInterface {
    name = 'Auctions1621764958649'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("CREATE TABLE `auctions` (`id` int NOT NULL AUTO_INCREMENT, `auction_id` varchar(255) NOT NULL, `address` varchar(255) NOT NULL, `creator` varchar(255) NOT NULL, `token` varchar(255) NOT NULL, `start_bid` varchar(255) NOT NULL, `step_bid` varchar(255) NOT NULL, `fee_bid` varchar(255) NOT NULL, `start_time` int UNSIGNED NOT NULL, `end_time` int UNSIGNED NOT NULL, `finish_bid` varchar(255) NULL, UNIQUE INDEX `IDX_18188c6a9d4178a772ef7e4b8c` (`auction_id`), INDEX `IDX_6e66f2d06d461f2a8f73da2936` (`token`), INDEX `IDX_ae3550905a636ddd34d41756cc` (`start_bid`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP INDEX `IDX_ae3550905a636ddd34d41756cc` ON `auctions`");
        await queryRunner.query("DROP INDEX `IDX_6e66f2d06d461f2a8f73da2936` ON `auctions`");
        await queryRunner.query("DROP INDEX `IDX_18188c6a9d4178a772ef7e4b8c` ON `auctions`");
        await queryRunner.query("DROP TABLE `auctions`");
    }

}

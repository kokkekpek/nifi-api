import {MigrationInterface, QueryRunner} from "typeorm";

export class Bids1621767858425 implements MigrationInterface {
    name = 'Bids1621767858425'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("CREATE TABLE `bids` (`id` int NOT NULL AUTO_INCREMENT, `bid_id` varchar(255) NOT NULL, `auction_id` varchar(255) NOT NULL, `creator` varchar(255) NOT NULL, `token` varchar(255) NOT NULL, `bider` varchar(255) NOT NULL, `value` varchar(255) NOT NULL, UNIQUE INDEX `IDX_7729bc1896e2c415e5e4a5091a` (`bid_id`), INDEX `IDX_7d24f04e55838b694acc9d35bf` (`auction_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP INDEX `IDX_7d24f04e55838b694acc9d35bf` ON `bids`");
        await queryRunner.query("DROP INDEX `IDX_7729bc1896e2c415e5e4a5091a` ON `bids`");
        await queryRunner.query("DROP TABLE `bids`");
    }

}

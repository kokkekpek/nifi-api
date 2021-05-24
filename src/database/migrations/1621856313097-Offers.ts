import {MigrationInterface, QueryRunner} from "typeorm";

export class Offers1621856313097 implements MigrationInterface {
    name = 'Offers1621856313097'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("CREATE TABLE `offers` (`id` int NOT NULL AUTO_INCREMENT, `offer_id` varchar(255) NOT NULL, `address` varchar(255) NOT NULL, `creator` varchar(255) NOT NULL, `token` varchar(255) NOT NULL, `price` varchar(255) NOT NULL, `fee` varchar(255) NOT NULL, `end_time` varchar(255) NOT NULL, `status` varchar(255) NOT NULL, `last_message_time` int UNSIGNED NOT NULL, UNIQUE INDEX `IDX_d611e618dbf3754ffb7fc1ffb3` (`offer_id`), INDEX `IDX_b0c6faa089dba93d03b1815c73` (`address`), INDEX `IDX_434239966cb60e2dbc6178f993` (`status`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP INDEX `IDX_434239966cb60e2dbc6178f993` ON `offers`");
        await queryRunner.query("DROP INDEX `IDX_b0c6faa089dba93d03b1815c73` ON `offers`");
        await queryRunner.query("DROP INDEX `IDX_d611e618dbf3754ffb7fc1ffb3` ON `offers`");
        await queryRunner.query("DROP TABLE `offers`");
    }

}

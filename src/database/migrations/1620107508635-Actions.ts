import {MigrationInterface, QueryRunner} from "typeorm";

export class Actions1620107508635 implements MigrationInterface {
    name = 'Actions1620107508635'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("CREATE TABLE `actions_change_owner` (`id` int NOT NULL AUTO_INCREMENT, `tokenId` varchar(255) NOT NULL, `address` varchar(255) NOT NULL, `user_public_key` varchar(255) NOT NULL, `previous_owner` varchar(255) NOT NULL, `owner` varchar(255) NOT NULL, `hash` varchar(255) NOT NULL, `time` varchar(255) NOT NULL, INDEX `IDX_9bf69c3fd66c765e329c7da545` (`tokenId`), INDEX `IDX_d636d61f1897074ef8f8009a40` (`user_public_key`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `actions_create_token` (`id` int NOT NULL AUTO_INCREMENT, `tokenId` varchar(255) NOT NULL, `address` varchar(255) NOT NULL, `user_public_key` varchar(255) NOT NULL, `owner` varchar(255) NOT NULL, `hash` varchar(255) NOT NULL, `time` varchar(255) NOT NULL, INDEX `IDX_16c3cf3edda540ffd94d26c384` (`tokenId`), INDEX `IDX_d60743ee64cfe0ab7823afbb68` (`user_public_key`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `actions_set_hash` (`id` int NOT NULL AUTO_INCREMENT, `tokenId` varchar(255) NOT NULL, `address` varchar(255) NOT NULL, `user_public_key` varchar(255) NOT NULL, `owner` varchar(255) NOT NULL, `previous_hash` varchar(255) NOT NULL, `hash` varchar(255) NOT NULL, `time` varchar(255) NOT NULL, INDEX `IDX_5925a27c8ed6fc876d38ff9d61` (`tokenId`), INDEX `IDX_9dab4a414dc94714f0962d1be1` (`user_public_key`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP INDEX `IDX_9dab4a414dc94714f0962d1be1` ON `actions_set_hash`");
        await queryRunner.query("DROP INDEX `IDX_5925a27c8ed6fc876d38ff9d61` ON `actions_set_hash`");
        await queryRunner.query("DROP TABLE `actions_set_hash`");
        await queryRunner.query("DROP INDEX `IDX_d60743ee64cfe0ab7823afbb68` ON `actions_create_token`");
        await queryRunner.query("DROP INDEX `IDX_16c3cf3edda540ffd94d26c384` ON `actions_create_token`");
        await queryRunner.query("DROP TABLE `actions_create_token`");
        await queryRunner.query("DROP INDEX `IDX_d636d61f1897074ef8f8009a40` ON `actions_change_owner`");
        await queryRunner.query("DROP INDEX `IDX_9bf69c3fd66c765e329c7da545` ON `actions_change_owner`");
        await queryRunner.query("DROP TABLE `actions_change_owner`");
    }

}

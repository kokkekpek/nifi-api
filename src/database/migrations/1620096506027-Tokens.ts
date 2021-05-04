import {MigrationInterface, QueryRunner} from "typeorm";

export class Tokens1620096506027 implements MigrationInterface {
    name = 'Tokens1620096506027'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("CREATE TABLE `tokens` (`id` int NOT NULL AUTO_INCREMENT, `tokenId` varchar(255) NOT NULL, `address` varchar(255) NOT NULL, `user_public_key` varchar(255) NOT NULL, `owner` varchar(255) NOT NULL, `hash` varchar(255) NOT NULL, UNIQUE INDEX `IDX_f4940ff249082f72f9877d3b24` (`tokenId`), INDEX `IDX_0ba3c13d86c001e1e8f86be833` (`user_public_key`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP INDEX `IDX_0ba3c13d86c001e1e8f86be833` ON `tokens`");
        await queryRunner.query("DROP INDEX `IDX_f4940ff249082f72f9877d3b24` ON `tokens`");
        await queryRunner.query("DROP TABLE `tokens`");
    }

}

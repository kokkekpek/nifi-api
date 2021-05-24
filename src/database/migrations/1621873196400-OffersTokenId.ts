import {MigrationInterface, QueryRunner} from "typeorm";

export class OffersTokenId1621873196400 implements MigrationInterface {
    name = 'OffersTokenId1621873196400'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `offers` ADD `token_id` varchar(255) NOT NULL");
        await queryRunner.query("CREATE INDEX `IDX_baa629dddbead4dd6b894cafbb` ON `offers` (`token_id`)");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP INDEX `IDX_baa629dddbead4dd6b894cafbb` ON `offers`");
        await queryRunner.query("ALTER TABLE `offers` DROP COLUMN `token_id`");
    }

}

import {MigrationInterface, QueryRunner} from "typeorm";

export class OwnerIndex1620714515626 implements MigrationInterface {
    name = 'OwnerIndex1620714515626'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("CREATE INDEX `IDX_16359738e382cb61227b261c67` ON `actions_change_owner` (`owner`)");
        await queryRunner.query("CREATE INDEX `IDX_dd7787542b1bd18f96b3cf06a8` ON `actions_create_token` (`owner`)");
        await queryRunner.query("CREATE INDEX `IDX_89780eec09f674ef2af796b764` ON `actions_set_hash` (`owner`)");
        await queryRunner.query("CREATE INDEX `IDX_c9907e106ea8bbbd334106284b` ON `tokens` (`owner`)");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("DROP INDEX `IDX_c9907e106ea8bbbd334106284b` ON `tokens`");
        await queryRunner.query("DROP INDEX `IDX_89780eec09f674ef2af796b764` ON `actions_set_hash`");
        await queryRunner.query("DROP INDEX `IDX_dd7787542b1bd18f96b3cf06a8` ON `actions_create_token`");
        await queryRunner.query("DROP INDEX `IDX_16359738e382cb61227b261c67` ON `actions_change_owner`");
    }

}

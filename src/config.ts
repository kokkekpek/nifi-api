import { MysqlConfig } from "./database/database";

export type Config = {
	readonly isProduction: boolean;
	readonly mysql: MysqlConfig;
};
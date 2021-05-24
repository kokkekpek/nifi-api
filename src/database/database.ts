import {
	createConnection,
	Connection
} from "typeorm";
import { DatabaseActionChangeOwner } from "./models/action-change-owner";
import { DatabaseActionCreateToken } from "./models/action-create-token";
import { DatabaseActionSetHash } from "./models/action-set-hash";
import { DatabaseAuction } from "./models/auction";
import { DatabaseBid } from "./models/bid";
import { DatabaseOffer } from "./models/offer";
import { DatabaseToken } from "./models/token";


export type MysqlConfig = {
	readonly host: string;
	readonly port: number;
	readonly user: string;
	readonly password: string;
	readonly database: string;
	readonly charset: string;
};

export async function createDatabase(config: MysqlConfig): Promise<Connection> {
	const connection = await createConnection({
		type: "mysql",
		host: config.host,
		port: config.port,
	
		username: config.user,
		password: config.password,
	
		database: config.database,

		synchronize: false,
		migrations: ["dist/database/migrations/*.js"],
		migrationsRun: true,
		migrationsTableName: "migrations",
	
		charset: config.charset,

		bigNumberStrings: true,
	
		entities: [
			DatabaseToken,
			DatabaseActionChangeOwner,
			DatabaseActionSetHash,
			DatabaseActionCreateToken,
			DatabaseAuction,
			DatabaseBid,
			DatabaseOffer
		]
	});

	return connection;
}
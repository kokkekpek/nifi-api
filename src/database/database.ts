import {
	createConnection,
	Connection
} from "typeorm";


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
	
		entities: []
	});

	return connection;
}
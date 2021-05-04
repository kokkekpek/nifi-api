import 'source-map-support/register';
import * as fs from "fs";
import * as rg from "rg";
import { Config } from './config';
import { createDatabase } from './database/database';

async function main(): Promise<void> {
	const RAW_DEFAULT_CONFIG = fs.readFileSync('./config.default.json', 'utf-8');
	let RAW_CONFIG = "{}";

	try {
		RAW_CONFIG = fs.readFileSync("./config.json", "utf-8");
	} catch (err) {
		if (err.code !== "ENOENT") {
			console.error(err);
			process.exit(1);
		}
	}

	const config = rg.getMergedObjects<Config>(
		JSON.parse(RAW_DEFAULT_CONFIG),
		JSON.parse(RAW_CONFIG)
	);

	if (config.isProduction) {
		rg.setProduction();
	}

	console.log("Инициализация базы данных...");
	await createDatabase(config.mysql);
	
	console.log("Инициализация завершена!");
}

main();
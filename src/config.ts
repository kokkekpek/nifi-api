import { MysqlConfig } from "./database/database";
import { RpcServerConfig } from "./rpc/rpc-server";

export type Config = {
	readonly isProduction: boolean;
	readonly mysql: MysqlConfig;
	readonly rpcServer: RpcServerConfig;
	readonly ton: {
		readonly serverAddress: string;
		readonly rootContractAddress: string;
		readonly offersContractAddress: string;
	};
};
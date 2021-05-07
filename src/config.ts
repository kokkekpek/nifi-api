import { MysqlConfig } from "./database/database";
import { RpcServerConfig } from "./rpc/rpc-server";

export type Config = {
	readonly isProduction: boolean;
	readonly mysql: MysqlConfig;
	readonly rpcServer: RpcServerConfig;
	readonly rootContractAddress: string;
};
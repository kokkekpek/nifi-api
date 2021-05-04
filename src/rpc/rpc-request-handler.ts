import { RpcRequest } from "./rpc-request";

export type RequestData = Record<string, string | number>;

export type RpcRequestHandlerRequiredParameter = {
	readonly parameterName: string;
	readonly parameterType: "string" | "number";
};

export interface IRpcRequestHandler<Parameters extends RequestData> {
	onRequest(request: RpcRequest<Parameters>): void | Promise<void>;
	getRequiredParameters(): RpcRequestHandlerRequiredParameter[];
}
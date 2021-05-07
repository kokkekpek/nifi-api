import * as http from "http";
import { StatusCodes } from "rg-web";
import { RpcRequest } from "./rpc-request";
import { IRpcRequestHandler, RequestData } from "./rpc-request-handler";

type RequestValidationSuccess = {
	method: string;
	rawVariables: string;
};

type RequestValidationError = null;

type RequestValidationResult =
	RequestValidationSuccess |
	RequestValidationError;

export type RpcServerConfig = {
	readonly port: number;
};

export class RpcServer {
	private readonly config: RpcServerConfig;
	private readonly server: http.Server;
	private readonly methods = new Map<string, IRpcRequestHandler<RequestData>>();

	constructor(config: RpcServerConfig) {
		this.config = config;
		this.server = http.createServer(this.requestListener.bind(this));
	}

	public async start(): Promise<void> {
		return new Promise((resolve) => {
			this.server.listen(this.config.port, () => {
				resolve();
			});
		});
	}

	public addMethod(methodName: string, methodHandler: IRpcRequestHandler<RequestData>): void {
		this.methods.set(methodName, methodHandler);
	}

	private async requestListener(
		req: http.IncomingMessage,
		res: http.ServerResponse
	): Promise<void> {
		const request = new RpcRequest(req, res, {});
		console.log("RPC Request:", req.method, req.url);

		const validationResult = this.getValidatedRequest(req);

		if (validationResult === null) {
			console.log("RPC Request failed basic validation, rejected");
			request.error("rpc_validation_fault", StatusCodes.BadRequest);

			return;
		}

		const { rawVariables } = validationResult;

		const variables = this.getParsedVariables(rawVariables);

		const handler = this.methods.get(validationResult.method);

		if (!handler) {
			console.log("RPC Request: Method could not be found, rejected");
			request.error("rpc_method_not_found", StatusCodes.NotFound);

			return;
		}

		const requiredParameters = handler.getRequiredParameters();

		const parameters: RequestData = {};
		let isValidationFailed = false;

		for (const parameter of requiredParameters) {
			const val = variables[parameter.parameterName];

			if (val === undefined) {
				isValidationFailed = true;
				break;
			}

			switch (parameter.parameterType) {
				case "number": {
					const num = +val;

					if (isNaN(num)) {
						isValidationFailed = true;
						break;
					}
	
					parameters[parameter.parameterName] = num;
					break;
				}

				case "string": {
					parameters[parameter.parameterName] = val;
					break;
				}
			}
		}

		if (isValidationFailed) {
			console.log("RPC Request: Invalid parameters, rejected");
			request.error("rpc_bad_parameters", StatusCodes.BadRequest);
			return;
		}

		const checkedRequest = new RpcRequest(req, res, parameters);

		try {
			await handler.onRequest(checkedRequest);
		} catch (err) {
			console.error("Fatal error occurred while processing an RPC Request:");
			console.error("Request details:", req.method, req.url);
			console.error(err);

			request.error("rpc_internal_error", StatusCodes.IntervalServerError);
		}
	}

	private getValidatedRequest(
		req: http.IncomingMessage
	): RequestValidationResult {
		if (!req.url) {
			return null;
		}

		if (req.method !== "GET") {
			return null;
		}

		const urlPath = req.url.split("/");
		const methodAndParameters = urlPath[1];

		if (!methodAndParameters) {
			return null;
		}

		const splitted: (string | undefined)[] = methodAndParameters.split("?");
		const method = splitted[0];

		if (!method) {
			return null;
		}

		let rawVariables = splitted[1];

		if (!rawVariables) {
			rawVariables = "";
		}

		return {
			method,
			rawVariables
		};
	}

	private getParsedVariables(rawVariables: string): Record<string, string> {
		const result: Record<string, string> = {};

		const splitted = rawVariables.split("&");

		for (const entry of splitted) {
			if (entry === "") {
				continue;
			}

			const splittedVariable = entry.split("=");

			const splittedVariable0 = splittedVariable[0] || "";
			const splittedVariable1 = splittedVariable[1] || "";

			const variableName  = decodeURIComponent(splittedVariable0);
			const variableValue = decodeURIComponent(splittedVariable1);

			result[variableName] = variableValue;
		}

		return result;
	}
}
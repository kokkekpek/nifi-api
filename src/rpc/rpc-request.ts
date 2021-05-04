import * as http from "http";
import { StatusCodes } from "rg-web";
import { RequestData } from "./rpc-request-handler";

export class RpcRequest<Parameters extends RequestData> {
	private readonly req: http.IncomingMessage;
	private readonly res: http.ServerResponse;

	private readonly parameters: Parameters;

	constructor(req: http.IncomingMessage, res: http.ServerResponse, parameters: Parameters) {
		this.req = req;
		this.res = res;

		this.parameters = parameters;
	}

	private send(payload: unknown): void {
		const response = JSON.stringify(payload);

		const headers: http.IncomingHttpHeaders = {
			"content-length": Buffer.byteLength(response) + "",
			"content-type": "application/json"
		};

		this.res.writeHead(this.res.statusCode, headers);

		this.res.end(response);
	}

	public success(data?: unknown): void {
		this.res.statusCode = StatusCodes.Ok;

		const payload = {
			success: true,
			data
		};

		this.send(payload);
	}

	public error(message: string, statusCode: StatusCodes): void {
		this.res.statusCode = statusCode;

		const payload = {
			success: false,
			error: message
		};

		this.send(payload);
	}

	public getParameters(): Parameters {
		return this.parameters;
	}
}
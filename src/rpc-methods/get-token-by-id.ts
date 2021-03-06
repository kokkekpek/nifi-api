import { Repository } from "typeorm";
import { DatabaseCollection } from "../database/models/collection";
import { RpcRequest } from "../rpc/rpc-request";
import { IRpcRequestHandler, RpcRequestHandlerRequiredParameter } from "../rpc/rpc-request-handler";
import { StatusCodes } from "../rpc/rpc-server";
import { TokensManager } from "../tokens/tokens-manager";

type Parameters = {
	readonly tokenId: string;
	readonly collectionId: string;
};

export class GetTokenById implements IRpcRequestHandler<Parameters> {
	private readonly tokensManager: TokensManager;
	private rpo: Repository<DatabaseCollection>;

	constructor(tokensManager: TokensManager, rpo: Repository<DatabaseCollection>) {
		this.tokensManager = tokensManager;
		this.rpo = rpo;
	}

	public async onRequest(request: RpcRequest<Parameters>): Promise<void> {
		const parameters = request.getParameters();
		const result = await this.tokensManager.getTokenById(parameters.tokenId, parameters.collectionId);

		if (!result) {
			request.error("Not found", StatusCodes.NotFound);
			return;
		}

		const coll = await this.rpo.findOne({ tokenId: parameters.collectionId });
		const bad = result as any;
		bad.collectionDto = coll;

		request.success(bad);
	}

	public getRequiredParameters(): RpcRequestHandlerRequiredParameter[] {
		return [{
			parameterName: "tokenId",
			parameterType: "string"
		}, {
			parameterName: "collectionId",
			parameterType: "string"
		}];
	}
}
import { Repository } from "typeorm";
import { DatabaseCollection } from "../database/models/collection";
import { RpcRequest } from "../rpc/rpc-request";
import { IRpcRequestHandler, RpcRequestHandlerRequiredParameter } from "../rpc/rpc-request-handler";

type Parameters = {
	readonly collectionId: string;
};

export class GetCollection implements IRpcRequestHandler<Parameters>  {
	private readonly repo: Repository<DatabaseCollection>;

	constructor(repo: Repository<DatabaseCollection>) {
		this.repo = repo;
	}

	public async onRequest(request: RpcRequest<Parameters>): Promise<void> {
		const result = await this.repo.find({ tokenId: request.getParameters().collectionId });

		request.success({
			result
		});
	}

	public getRequiredParameters(): RpcRequestHandlerRequiredParameter[] {
		return [{
			parameterName: "collectionId",
			parameterType: "string"
		}];
	}
}
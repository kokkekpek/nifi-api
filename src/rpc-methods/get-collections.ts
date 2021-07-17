import { Repository } from "typeorm";
import { DatabaseCollection } from "../database/models/collection";
import { RpcRequest } from "../rpc/rpc-request";
import { IRpcRequestHandler, RpcRequestHandlerRequiredParameter } from "../rpc/rpc-request-handler";

export class GetAllCollections implements IRpcRequestHandler<Record<string, never>> {
	private readonly repo: Repository<DatabaseCollection>;

	constructor(repo: Repository<DatabaseCollection>) {
		this.repo = repo;
	}

	public async onRequest(request: RpcRequest<Record<string, never>>): Promise<void> {
		const result = await this.repo.find();

		request.success({
			result
		});
	}

	public getRequiredParameters(): RpcRequestHandlerRequiredParameter[] {
		return [];
	}
}
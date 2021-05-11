import { ActionsManager } from "../actions/actions-manager";
import { RpcRequest } from "../rpc/rpc-request";
import { IRpcRequestHandler, RpcRequestHandlerRequiredParameter } from "../rpc/rpc-request-handler";

type Parameters = {
	readonly owner: string;
};

export class GetActionsByOwner implements IRpcRequestHandler<Parameters> {
	private readonly actionsManager: ActionsManager;

	constructor(actionsManager: ActionsManager) {
		this.actionsManager = actionsManager;
	}

	public async onRequest(request: RpcRequest<Parameters>): Promise<void> {
		const parameters = request.getParameters();
		const result = await this.actionsManager.getActionsByOwner(parameters.owner);

		request.success({
			result
		});
	}

	public getRequiredParameters(): RpcRequestHandlerRequiredParameter[] {
		return [{
			parameterName: "owner",
			parameterType: "string"
		}];
	}
}
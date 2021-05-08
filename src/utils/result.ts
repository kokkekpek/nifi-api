export type RgSuccess<T> = {
	is_success: true;
	data: T;
};

export type RgError<E = number> = {
	is_success: false;
	error: {
		code: E;
		message?: string;
	};
};

export type RgResult<T, E = number> = RgSuccess<T> | RgError<E>;
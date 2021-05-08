import { Colors } from "../utils/colors";
import * as util from "util";
import { promises as fs, PathLike } from "fs";
import { mutexLockOrAwait, mutexUnlock } from "../utils/mutex";

import {
	isProduction,
	getDateHumanReadable,
	getTimeHumanReadable
} from "../utils/utils";

const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

type FileDescriptor = {
	filename: string | null;
	fh: fs.FileHandle | null;
};

/** Файловый дескриптор для обычных логов */
const fdLogs: FileDescriptor = {
	filename: null,
	fh: null
};

/** Файловый дескриптор для ошибок */
const fdErrors: FileDescriptor = {
	filename: null,
	fh: null
};

/** Файловый дескриптор для предупреждений */
const fdWarnings: FileDescriptor = {
	filename: null,
	fh: null
};

const LOGS_DIRECTORY = "./logs";
const ERRORS_DIRECTORY = LOGS_DIRECTORY + "/errors";
const WARNINGS_DIRECTORY = LOGS_DIRECTORY + "/warnings";

function debug(...args: any[]): void {
	if (isProduction()) {
		return;
	}

	log(...args);
}

function warn(...args: any[]): void {
	const prefix = "Warning:";

	if (isProduction()) {
		const entry = util.format(prefix + " %s", ...args);

		writeToLogFile(WARNINGS_DIRECTORY, entry, fdWarnings);

		return;
	}

	originalWarn(
		"%s %s%s",
		Colors.FgYellow + prefix + Colors.Reset,
		...args,
		Colors.Reset
	);
}

function error(...args: any[]): void {
	const prefix = "Error:";

	if (isProduction()) {
		const entry = util.format(prefix + " %s", ...args);

		writeToLogFile(ERRORS_DIRECTORY, entry, fdErrors);

		return;
	}
	
	originalError(
		"%s %s%s",
		Colors.BgRed + prefix,
		...args,
		Colors.Reset
	);
}

function log(...args: any[]): void {
	if (isProduction()) {
		const entry = util.format("%s", ...args);

		writeToLogFile(LOGS_DIRECTORY, entry, fdLogs);

		return;
	}

	originalLog(...args);
}

async function writeToLogFile(
	dir: PathLike,
	entry: string,
	fd: FileDescriptor
): Promise<void> {
	await mutexLockOrAwait("librg_log_file_appending");

	if (!isDirectoryChecked) {
		await checkLogsDirectory();
	}

	const now: number = Date.now();

	const date: string = getDateHumanReadable(now);
	const time: string = getTimeHumanReadable(now);

	const filename = date + ".txt";
	const path: PathLike = dir + "/" + filename;
	const data = "[" + time + "]" + " " + entry + "\n";

	if (fd.filename !== filename) {
		if (fd.fh) {
			fd.fh.close();
			fd.fh = null;
		}
		
		const fh = await fs.open(path, "a");

		fd.filename = filename;
		fd.fh = fh;
	}

	if (fd.fh) {
		await fd.fh.appendFile(Buffer.from(data));
	} else {
		console.error(
			"Log File Handle is not accessable, logging here:\n",
			data
		);
	}

	mutexUnlock("librg_log_file_appending");
}

let isDirectoryChecked = false;

async function checkLogsDirectory(): Promise<void> {
	if (isDirectoryChecked) {
		return;
	}

	isDirectoryChecked = true;

	const directory: string[] | undefined = await getDirectory(LOGS_DIRECTORY);

	await getDirectory(ERRORS_DIRECTORY);
	await getDirectory(WARNINGS_DIRECTORY);
}

async function getDirectory(path: PathLike): Promise<string[]> {
	let dir: string[];

	try {
		dir = await fs.readdir(path);
	} catch {
		await fs.mkdir(path);
		dir = await fs.readdir(path);
	}

	return dir;
}

const unsafeConsole = <any> console;

if (!unsafeConsole.isRealgraceConsole) {
	console.log = log;
	console.debug = debug;
	console.error = error;
	console.warn = warn;

	unsafeConsole.isRealgraceConsole = true;
}

export {};
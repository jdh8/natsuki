import * as subcommands from "./sub/base64.mjs";
import manual from "../../data/manual.json";

const fallback = action => action.reply(manual.base64);

export const base64 = (action, content) =>
{
	const [, command, text] = /(\S*)\s*([^]*)/.exec(content);
	return (subcommands[command] || fallback)(action, text);
};

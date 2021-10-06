import * as subcommands from "./sub/base64.mjs";
import manual from "../../data/manual.json";

const fallback = message => message.reply(manual.base64);

export const base64 = (message, content) =>
{
	const [, command, text] = /(\S*)\s*([^]*)/.exec(content);
	return (subcommands[command] || fallback)(message, text);
};

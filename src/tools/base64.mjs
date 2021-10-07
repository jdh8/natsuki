import * as subcommands from "./sub/base64.mjs";
import manual from "../../data/manual.json";

const fallback = action => action.reply(manual.base64);

export const base64 = (action, option) =>
{
	switch (option.name) {
		case "encode":
			return action.reply(Buffer.from(option.options[0].value).toString("base64"));
		case "decode":
			return action.reply({ content: `${Buffer.from(option.options[0].value, "base64")}`, ephemeral: true });
	}

	const [, command, text] = /(\S*)\s*([^]*)/.exec(option);
	return (subcommands[command] || fallback)(action, text);
};

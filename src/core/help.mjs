import manual from "../../data/manual.json";

export const help = (message, content = "") =>
{
	const command = /\S*/.exec(content);
	return message.reply(manual[command] || `The command \`${command}\` is not found.`);
};

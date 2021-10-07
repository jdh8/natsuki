import manual from "../../data/manual.json";

export const help = (action, content = "") =>
{
	const command = /\S*/.exec(content);
	return action.reply(manual[command] || `The command \`${command}\` is not found.`);
};

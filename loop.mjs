import Discord from "discord.js";
import * as natsuki from "./index.mjs";

export default message =>
{
	if (message.author.bot || message.channel instanceof Discord.DMChannel)
		return;

	const match = /^(?:n\.|(<@!?410315411695992833>)\s*)(\S*)\s*([^]*)/.exec(message.content);

	if (match) {
		const [, mention, command, content] = match;
		const f = natsuki[command];
		return f ? f(message, content, mention) : mention && message.react("408016032410894346");
	}
};

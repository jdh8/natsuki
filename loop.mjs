import * as natsuki from "./index.mjs";

export default message =>
{
	if (message.author.bot)
		return;

	const match = /^(?:n\.|(<@!?410315411695992833>)\s*)(\S*)\s*([^]*)/.exec(message.content);

	if (match) {
		const [, mention, command, content] = match;
		const f = natsuki[command] || (mention && command == "," && content && natsuki.chat);
		return f ? f(message, content, mention) : mention && message.react("433490397516267532");
	}
};

import * as natsuki from "./index.mjs";

export default message =>
{
	if (message.author.bot)
		return;

	const greet = message => message.react("408016032410894346");
	const match = /^(?:n\.|(<@!?410315411695992833>)\s*)(\S*)\s*([^]*)/.exec(message.content);

	if (match) {
		const [, mention, command, content] = match;
		const f = natsuki[command];
		return f ? f(message, content) : mention && greet(message);
	}

	if (/<@!?410315411695992833>|\b(?:natsuki|(?:anim[eéê]|hentai|manga)s?\b)/i.test(message.content))
		return greet(message);

	if (/[n🇳]\s?[i🇮]\s?(?:[bg🇧🅱🇬]\s?){2}\s?(?:[a🅰🇦]|[e🇪]\s?[r🇷])/iu.test(message.content))
		return natsuki.word(message);
};

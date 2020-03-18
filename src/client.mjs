import * as natsuki from "./natsuki.mjs";
import Discord from "discord.js";
import DBL from "dblapi.js";

const client = new Discord.Client();
const dbl = new DBL(process.env.DBL_TOKEN, client);

const loop = message =>
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

client.on("ready", () => client.user.setActivity("n.help | n.invite"));

client.on("message", message =>
{
	const send = error => message.channel.send(`${error}`).catch(() => {});

	try {
		const promise = loop(message);
		promise && promise.catch(send);
	}
	catch (error) {
		send(error);
		console.warn(`[WARNING] ${message.content}
${error}`);
	}
});

client.login(process.env.TOKEN);

export default client;

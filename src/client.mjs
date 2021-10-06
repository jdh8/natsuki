import * as natsuki from "./natsuki.mjs";
import { Client, Intents } from "discord.js";
import TopGG from "dblapi.js";

const client = new Client({
	intents:
		Intents.FLAGS.GUILDS |
		Intents.FLAGS.GUILD_MESSAGES |
		Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
	allowedMentions: {
		parse: ["users", "roles"],
		repliedUser: false
	},
});

client.on("ready", () => client.user.setActivity("n.help | n.invite"));

client.on("messageCreate", message =>
{
	if (message.author.bot)
		return;

	const send = x => message.reply(`${x}`).catch(() => {});
	const match = /^(?:n\.|(<@!?410315411695992833>)\s*)(\S*)\s*([^]*)/.exec(message.content);

	if (match == null)
		return;

	const [, mention, command, content] = match;

	try {
		if (command in natsuki)
			natsuki[command](message, content, mention).catch(send);
	}
	catch (error) {
		send(error);
		console.error(message.content);
		console.error(error);
	}
});

client.login(process.env.TOKEN);

if (process.env.TOP_GG_TOKEN)
	new TopGG(process.env.TOP_GG_TOKEN, client);

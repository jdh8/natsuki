import * as natsuki from "./natsuki.mjs";
import application from "../data/application.json";
import { Client, Intents } from "discord.js";
import TopGG from "dblapi.js";

const client = new Client({
	intents:
		Intents.FLAGS.GUILDS |
		Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS |
		Intents.FLAGS.GUILD_MESSAGES |
		Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
	allowedMentions: {
		parse: ["users", "roles"],
		repliedUser: false
	},
});

client.on("ready", () =>
{
	const { GUILD } = process.env;
	(GUILD ? client.guilds.resolve(GUILD) : client.application).commands.set(application);
	client.user.setActivity("/help | /invite");
});

client.on("interactionCreate", interaction =>
{
	const callback = natsuki[interaction.commandName.replaceAll("-", "_").replaceAll(" ", "")];

	try {
		callback(interaction, ...interaction.options.data.map(x => x.value)).catch(console.error);
	}
	catch (error) {
		console.error(error);
		console.error(interaction);
	}
});

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

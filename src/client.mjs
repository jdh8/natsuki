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

const sanitize = (f, message, ...args) =>
{
	const send = x => message.reply(`${x}`).catch(() => {});

	try {
		f(message, ...args).catch(send);
	}
	catch (error) {
		send(error);
		console.error(message.command || message.content);
		console.error(error);
	}
};

client.on("ready", () =>
{
	client.application.commands.set(application);
	client.user.setActivity("/help | /invite");
});

client.on("interactionCreate", interaction =>
{
	const callback = natsuki[interaction.commandName];

	if (interaction.isCommand())
		sanitize(callback, interaction, interaction.options.data.map(x => x.value));
});

client.on("messageCreate", message =>
{
	if (message.author.bot)
		return;

	const match = /^(?:n\.|(<@!?410315411695992833>)\s*)(\S*)\s*([^]*)/.exec(message.content);

	if (match == null)
		return;

	const [, mention, command, content] = match;

	if (command in natsuki)
		sanitize(natsuki[command], message, content, mention);
});

client.login(process.env.TOKEN);

if (process.env.TOP_GG_TOKEN)
	new TopGG(process.env.TOP_GG_TOKEN, client);

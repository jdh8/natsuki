import * as natsuki from "./natsuki.mjs";
import application from "../data/application.json" assert { type: "json" };
import { Client, Intents } from "discord.js";

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

let regex = /^n\.(\S*)\s*([^]*)/;

client.on("ready", () =>
{
	const { GUILD } = process.env;
	(GUILD ? client.guilds.resolve(GUILD) : client.application).commands.set(application);
	regex = RegExp(String.raw`^(?:n\.|(<@!?${ client.user.id }>)\s*)(\S*)\s*([^]*)`);
	client.user.setActivity("/help | /invite");
});

client.on("interactionCreate", interaction =>
{
	if (interaction.isMessageComponent())
		return;

	const callback = natsuki[interaction.commandName
		.replace(/ [a-z]/g, s => s[1].toUpperCase())
		.replaceAll("-", "_")];

	try {
		callback(interaction, ...interaction.options.data).catch(console.error);
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

	const send = x => message.reply(`${ x }`).catch(() => {});
	const match = regex.exec(message.content);

	if (match == null)
		return;

	const [, mention, command, content] = match;

	try {
		natsuki[command]?.(message, content, mention).catch(send);
	}
	catch (error) {
		send(error);
		console.error(message.content);
		console.error(error);
	}
});

client.login(process.env.TOKEN);

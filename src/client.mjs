import * as natsuki from "./natsuki.mjs";
import Discord from "discord.js";
import TopGG from "dblapi.js";

const client = new Discord.Client();

client.on("ready", () => client.user.setActivity("n.help | n.invite"));

client.on("message", message =>
{
	const send = x => message.channel.send(`${x}`).catch(() => {});

	try {
		if (message.author.bot)
			return;

		const match = /^(?:n\.|(<@!?410315411695992833>)\s*)(\S*)\s*([^]*)/.exec(message.content);

		if (match != null) {
			const [, mention, command, content] = match;

			if (command in natsuki)
				natsuki[command](message, content, mention).catch(send);
		}
	}
	catch (error) {
		send(error);
		console.error(message.content);
		console.error(error);
	}
});

client.login(process.env.TOKEN);

new TopGG(process.env.TOP_GG_TOKEN, client);

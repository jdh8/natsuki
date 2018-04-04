import Discord from "discord.js";
import loop from "./loop.mjs";

export const client = new Discord.Client();

client.on("ready", () => client.user.setPresence({ game: { name: "n.help | n.invite" }}));

client.on("ready", () =>
{
	const channel = client.channels.get("420885744077504532");

	channel.fetchMessages().then(collection =>
	{
		for (let message of collection.values())
			if (message.author.id == client.user.id)
				message.delete();
	}).catch(() => {});

	channel.send(client.emojis.map(icon => `:${icon.name}: ${icon}`), { split: true });
});

client.on("message", async message =>
{
	try {
		await loop(message);
	}
	catch (error) {
		message.channel.send(`An error occurred.  Please leave a note on my shelf if it lingers.
https://discord.gg/VdHYvMC
\`\`\`
${error}
\`\`\``).catch(() => {});
	}
});

client.login(process.env.TOKEN);

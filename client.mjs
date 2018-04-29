import Discord from "discord.js";
import snekfetch from "snekfetch";
import loop from "./loop.mjs";

export const client = new Discord.Client();

client.on("ready", () => client.user.setPresence({ game: { name: "n.help | n.invite" }}));

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

const update = () => snekfetch.post(`https://discordbots.org/api/bots/${client.user.id}/stats`)
	.set("Authorization", process.env.DBL_TOKEN)
	.send({ server_count: client.guilds.size })
	.catch(() => {});

client.on("ready", update);
client.on("guildCreate", update);
client.on("guildRemove", update);

client.login(process.env.TOKEN);

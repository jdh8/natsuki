import Discord from "discord.js";
import DBL from "dblapi.js";
import loop from "./loop.mjs";

export const client = new Discord.Client();
export const dbl = new DBL(process.env.DBL_TOKEN, client);

client.on("ready", () => client.user.setActivity("n.help | n.invite"));

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

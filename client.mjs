import Discord from "discord.js";
import DBL from "dblapi.js";
import loop from "./loop.mjs";

const client = new Discord.Client();
const dbl = new DBL(process.env.DBL_TOKEN, client);

client.on("ready", () => client.user.setActivity("n.help | n.invite"));

client.on("message", async message =>
{
	try {
		await loop(message);
	}
	catch (error) {
		message.channel.send(`${error}`).catch(() => {});
	}
});

client.login(process.env.TOKEN);

export default client;

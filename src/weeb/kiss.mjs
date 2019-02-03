import pick from "../../lib/pick.mjs";
import kisses from "../../data/kisses.json";
import Discord from "discord.js";

export const kiss = (message, content) => message.channel.send(new Discord.RichEmbed({
	description: `${message.author} kissed ${content || "Natsuki"}!`,
	image: { url: pick(kisses) },
}));

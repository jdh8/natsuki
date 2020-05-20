import sample from "../lib/sample.mjs";
import kisses from "../../data/kisses.json";
import Discord from "discord.js";

export const kiss = (message, content) => message.channel.send(new Discord.MessageEmbed({
	description: `${message.author} kissed ${content || "Natsuki"}!`,
	image: { url: sample(kisses) },
}));

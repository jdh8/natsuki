import sample from "../lib/sample.mjs";
import hugs from "../../data/hugs.json";
import Discord from "discord.js";

export const hug = (message, content) => message.channel.send(new Discord.MessageEmbed({
	description: `${message.author} hugged ${content || "Yuri"}!`,
	image: { url: sample(hugs) },
}));

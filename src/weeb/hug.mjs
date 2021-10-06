import sample from "../lib/sample.mjs";
import hugs from "../../data/hugs.json";

export const hug = (message, content) => message.reply({ embeds: [{
	description: `${message.member || message.author} hugged ${content || "Yuri"}!`,
	image: { url: sample(hugs) },
}]});

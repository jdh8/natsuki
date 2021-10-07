import sample from "../lib/sample.mjs";
import hugs from "../../data/hugs.json";

export const hug = (action, content) => action.reply({ embeds: [{
	description: `${action.member || action.author} hugged ${content || "Yuri"}!`,
	image: { url: sample(hugs) },
}]});

import sample from "../lib/sample.mjs";
import hugs from "../../data/hugs.json";

export const hug = (action, option) => action.reply({ embeds: [{
	description: `${action.member ?? action.author} hugged ${(option?.value ?? option) || "Yuri"}!`,
	image: { url: sample(hugs) },
}]});

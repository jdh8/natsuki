import sample from "../lib/sample.mjs";
import kisses from "../../data/kisses.json";

export const kiss = (action, content) => action.reply({ embeds: [{
	description: `${action.member || action.author} kissed ${content || "Natsuki"}!`,
	image: { url: sample(kisses) },
}]});

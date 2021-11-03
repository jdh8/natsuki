import sample from "../lib/sample.mjs";
import kisses from "../../data/kisses.json";

export const kiss = (action, option) => action.reply({ embeds: [{
	description: `${ action.member ?? action.author } kissed ${ (option?.value ?? option) || "Natsuki" }!`,
	image: { url: sample(kisses) },
}]});

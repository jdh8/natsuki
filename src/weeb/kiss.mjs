import sample from "../lib/sample.mjs";
import kisses from "../../data/kisses.json";

export const kiss = (message, content) => message.reply({ embeds: [{
	description: `${message.member || message.author} kissed ${content || "Natsuki"}!`,
	image: { url: sample(kisses) },
}]});

import nsfw from "../lib/nsfw.mjs";
import fetch from "node-fetch";

export const slurp = nsfw(async (action, option) =>
{
	action.channel.sendTyping();

	return action.reply({ embeds: [{
		description: `${ action.member || action.author } slurped ${ (option?.value ?? option) || "a random dick" }!`,
		image: await (await fetch("https://nekos.life/api/v2/img/bj")).json(),
	}]});
});

export const succ = slurp;
export const suck = slurp;

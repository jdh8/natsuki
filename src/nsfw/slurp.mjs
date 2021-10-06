import nsfw from "../lib/nsfw.mjs";
import fetch from "node-fetch";

export const slurp = nsfw(async (message, content) =>
{
	message.channel.sendTyping();

	return await message.reply({ embeds: [{
		description: `${message.author} slurped ${content || "a random dick"}!`,
		image: await (await fetch("https://nekos.life/api/v2/img/bj")).json(),
	}]});
});

export const succ = slurp;
export const suck = slurp;

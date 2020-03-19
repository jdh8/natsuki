import nsfw from "../lib/nsfw.mjs";
import typing from "../lib/typing.mjs";

import Discord from "discord.js";
import fetch from "node-fetch";

export const slurp = nsfw(typing(async (message, content) => await message.channel.send(new Discord.MessageEmbed({
	description: `${message.author} slurped ${content || "a random dick"}!`,
	image: await (await fetch("https://nekos.life/api/v2/img/bj")).json(),
}))));

export const succ = slurp;
export const suck = slurp;

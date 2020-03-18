import nsfw from "../lib/nsfw.mjs";
import typing from "../lib/typing.mjs";

import Discord from "discord.js";
import snekfetch from "snekfetch";

export const slurp = nsfw(typing(async (message, content) => await message.channel.send(new Discord.MessageEmbed({
	description: `${message.author} slurped ${content || "a random dick"}!`,
	image: (await snekfetch.get("https://nekos.life/api/v2/img/bj")).body,
}))));

export const succ = slurp;
export const suck = slurp;

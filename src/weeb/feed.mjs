import typing from "../lib/typing.mjs";
import Discord from "discord.js";
import fetch from "node-fetch";

export const feed = typing(async (message, content) => await message.channel.send(new Discord.MessageEmbed({
	description: `${message.author} fed ${content || "a random anime character"}!`,
	image: await (await fetch("https://nekos.life/api/v2/img/feed")).json(),
})));

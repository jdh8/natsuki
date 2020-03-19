import typing from "../lib/typing.mjs";
import Discord from "discord.js";
import fetch from "node-fetch";

export const neko = typing(async (message, content) =>
{
	const endpoint = message.channel.nsfw ? "https://nekos.life/api/v2/img/lewd" : "https://nekos.life/api/v2/img/neko";

	return await message.channel.send(new Discord.MessageEmbed({
		description: "Here comes your random neko.",
		image: await (await fetch(endpoint)).json(),
	}));
});

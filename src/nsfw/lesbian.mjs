import nsfw from "../lib/nsfw.mjs";
import typing from "../lib/typing.mjs";

import Discord from "discord.js";
import snekfetch from "snekfetch";

export const lesbian = nsfw(typing(async (message, content) => await message.channel.send(new Discord.MessageEmbed({
	description: "👩‍❤️‍👩👩‍❤️‍💋‍👩",
	image: (await snekfetch.get("https://nekos.life/api/v2/img/les")).body,
}))));

export const les = lesbian;

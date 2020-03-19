import nsfw from "../lib/nsfw.mjs";
import typing from "../lib/typing.mjs";

import Discord from "discord.js";
import fetch from "node-fetch";

export const lesbian = nsfw(typing(async (message, content) => await message.channel.send(new Discord.MessageEmbed({
	description: "👩‍❤️‍👩👩‍❤️‍💋‍👩",
	image: await (await fetch("https://nekos.life/api/v2/img/les")).json(),
}))));

export const les = lesbian;

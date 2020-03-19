import display from "../lib/display.mjs";
import nsfw from "../lib/nsfw.mjs";
import typing from "../lib/typing.mjs";

import Discord from "discord.js";
import sharp from "sharp";

export const fuck = nsfw(typing(async (message, content) =>
{
	const user = message.client.users.cache.get(/\d+|$/.exec(content)[0]);
	const text = `${message.author} fucked ${user || "Natsuki"}`;
	const image = sharp("assets/566424ede431200e3985ca6f21287cee.png");
	const fucked = user ? [display(user, 256, 20, 110)] : [];
	const components = [display(message.author, 256, 100, 364), ...fucked];
	const buffer = image.composite(await Promise.all(components)).webp().toBuffer();

	return await message.channel.send(text, new Discord.MessageAttachment(await buffer, "fuck.webp"));
}));

export const fucc = fuck;

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
	const fucker = { input: await display(message.author, 256), top: 100, left: 364 };
	const fucked = user ? [{ input: await display(user, 256), top: 20, left: 110 }] : [];
	const buffer = image.composite([fucker, ...fucked]).webp().toBuffer();

	return await message.channel.send(text, new Discord.MessageAttachment(await buffer, "fuck.webp"));
}));

export const fucc = fuck;

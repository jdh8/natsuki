import display from "../lib/display.mjs";
import nsfw from "../lib/nsfw.mjs";

import { MessageAttachment } from "discord.js";
import sharp from "sharp";

export const fuck = nsfw(async (message, content) =>
{
	message.channel.sendTyping();

	const user = message.client.users.cache.get(/\d+|$/.exec(content)[0]);
	const text = `${message.member || message.author} fucked ${user || "Natsuki"}`;
	const image = sharp("assets/566424ede431200e3985ca6f21287cee.png");
	const fucked = user ? [display(user, 256, 20, 110)] : [];
	const components = [display(message.member || message.author, 256, 100, 364), ...fucked];
	const buffer = image.composite(await Promise.all(components)).webp().toBuffer();

	return await message.reply({
		content: text,
		files: [new MessageAttachment(await buffer, "fuck.webp")]
	});
});

export const fucc = fuck;

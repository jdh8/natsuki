import display from "../lib/display.mjs";
import nsfw from "../lib/nsfw.mjs";

import { MessageAttachment } from "discord.js";
import sharp from "sharp";

export const fuck = nsfw(async (action, option = { user: false }) =>
{
	action.channel.sendTyping();

	const user = option.user ?? action.client.users.resolve(/\d+|$/.exec(option)[0]);
	const text = `${action.member ?? action.author} fucked ${user || "Natsuki"}`;
	const image = sharp("assets/566424ede431200e3985ca6f21287cee.png");
	const fucked = user ? [display(user, 256, 20, 110)] : [];
	const components = [display(action.member ?? action.author, 256, 100, 364), ...fucked];
	const buffer = image.composite(await Promise.all(components)).webp().toBuffer();

	return await action.reply({
		content: text,
		files: [new MessageAttachment(await buffer, "fuck.webp")],
	});
});

export const fucc = fuck;

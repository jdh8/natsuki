import display from "../lib/display.mjs";
import typing from "../lib/typing.mjs";

import Discord from "discord.js";
import sharp from "sharp";

export const cupcake = typing(async (message, content) =>
{
	const user = message.client.users.cache.get(/\d+|$/.exec(content)[0]) || message.author;
	const text = `${user} has been turned into a cupcake.  IT LOOKS SO CUUUUTE!`;
	const image = sharp("assets/290px-Hostess-Cupcake-Whole.jpg");
	const buffer = image.composite([await display(user, 128, 80, 80)]).webp().toBuffer();

	return message.channel.send(text, new Discord.MessageAttachment(await buffer, "cupcake.webp"));
});

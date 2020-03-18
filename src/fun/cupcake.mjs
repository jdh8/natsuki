import display from "../lib/display.mjs";
import typing from "../lib/typing.mjs";

import Discord from "discord.js";
import sharp from "sharp";

export const cupcake = typing(async (message, content) =>
{
	const user = message.client.users.cache.get(/\d+|$/.exec(content)[0]) || message.author;
	const text = `${user} has been turned into a cupcake.  IT LOOKS SO CUUUUTE!`;
	const image = sharp("assets/290px-Hostess-Cupcake-Whole.jpg");
	const composed = image.composite([{ input: await display(user, 128), top: 80, left: 80 }]);

	return message.channel.send(text, new Discord.MessageAttachment(await composed.webp().toBuffer(), "cupcake.webp"));
});

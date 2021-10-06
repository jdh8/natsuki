import display from "../lib/display.mjs";

import { MessageAttachment } from "discord.js";
import sharp from "sharp";

export const cupcake = async (message, content) =>
{
	message.channel.sendTyping();

	const user = message.client.users.cache.get(/\d+|$/.exec(content)[0]) || message.author;
	const text = `${user} has been turned into a cupcake.  IT LOOKS SO CUUUUTE!`;
	const image = sharp("assets/290px-Hostess-Cupcake-Whole.jpg");
	const buffer = image.composite([await display(user, 128, 80, 80)]).webp().toBuffer();

	return message.reply({
		content: text,
		files: [new MessageAttachment(await buffer, "cupcake.webp")]
	});
};

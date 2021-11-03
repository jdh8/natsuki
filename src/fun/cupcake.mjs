import display from "../lib/display.mjs";

import { MessageAttachment } from "discord.js";
import sharp from "sharp";

export const cupcake = async (action, option = { user: action.member }) =>
{
	action.channel.sendTyping();

	const user = option.user ?? action.client.users.resolve(/\d+|$/.exec(option)[0]) ?? action.author;
	const text = `${ user } has been turned into a cupcake.  IT LOOKS SO CUUUUTE!`;
	const image = sharp("assets/290px-Hostess-Cupcake-Whole.jpg");
	const buffer = image.composite([await display(user, 128, 80, 80)]).webp().toBuffer();

	return action.reply({
		content: text,
		files: [new MessageAttachment(await buffer, "cupcake.webp")]
	});
};

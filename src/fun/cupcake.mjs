import display from "../../lib/display.mjs";
import typing from "../../lib/typing.mjs";

import Discord from "discord.js";
import Jimp from "jimp";
import util from "util";

export const cupcake = typing(async (message, content) =>
{
	const user = message.client.users.cache.get(/\d+|$/.exec(content)[0]) || message.author;
	const text = `${user} has been turned into a cupcake.  IT LOOKS SO CUUUUTE!`;
	const image = Jimp.read("assets/290px-Hostess-Cupcake-Whole.jpg");
	const composed = (await image).composite((await Jimp.read(display(user))).resize(128, 128), 80, 80);
	const buffer = await util.promisify((...x) => composed.getBuffer(...x))("image/png");

	return message.channel.send(text, new Discord.Attachment(buffer, "cupcake.png"));
});

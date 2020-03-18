import display from "../lib/display.mjs";
import nsfw from "../lib/nsfw.mjs";
import typing from "../lib/typing.mjs";

import Discord from "discord.js";
import Jimp from "jimp";
import util from "util";

export const fuck = nsfw(typing(async (message, content) =>
{
	const user = message.client.users.cache.get(/\d+|$/.exec(content)[0]);
	const text = `${message.author} fucked ${user || "Natsuki"}`;
	const image = Jimp.read("assets/566424ede431200e3985ca6f21287cee.png");
	const composed = (await image).composite(await display(message.author, 256), 364, 100);

	if (user)
		composed.composite(await display(user, 256), 110, 20);

	const buffer = await util.promisify((...x) => composed.getBuffer(...x))("image/png");
	return await message.channel.send(text, new Discord.MessageAttachment(buffer, "fuck.png"));
}));

export const fucc = fuck;

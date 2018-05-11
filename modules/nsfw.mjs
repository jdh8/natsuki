import * as Message from "../util/Message.mjs";
import * as User from "../util/User.mjs";
import * as Random from "../util/Random.mjs";

import Discord from "discord.js";
import Jimp from "jimp";
import snekfetch from "snekfetch";
import xml2js from "xml2js";

import util from "util";

const nsfw = f => (message, ...rest) =>
	message.channel.nsfw ? f(message, ...rest) : message.channel.send("🔞 This command only works in NSFW channels!");

const XML = util.promisify(xml2js.parseString);
const cgi = string => string.split(/\s+/).map(encodeURIComponent).join("+");

const weeb = object => `Score: ${object.score}
${object.file_url}`;

export const fuck = nsfw(Message.typing(async (message, content) =>
{
	const avatar = async user => (await Jimp.read(User.avatar(user))).resize(256, 256);
	const user = message.client.users.get(/\d+/.exec(content));
	const text = `${message.author} fucked ${user || "Natsuki"}`;
	const image = Jimp.read("assets/566424ede431200e3985ca6f21287cee.png");
	const composed = (await image).composite(await avatar(message.author), 364, 125);

	if (user)
		composed.composite(await avatar(user), 110, 20);

	const buffer = await util.promisify((...x) => composed.getBuffer(...x))("image/png");
	return await message.channel.send(text, new Discord.Attachment(buffer, "fuck.png"));
}));

export const fucc = fuck;

export const rule34 = nsfw(Message.typing(async (message, content) =>
{
	const response = await snekfetch.get(`https://rule34.xxx/index.php?page=dapi&s=post&q=index&tags=${cgi(content)}`);
	const elements = (await XML(response.raw)).posts.post;
	return message.channel.send(elements ? weeb(Random.pick(elements).$) : `No image found for \`${content}\` on https://rule34.xxx/`);
}));

export const r34 = rule34;

export const slurp = nsfw(Message.typing(async (message, content) => message.channel.send(new Discord.RichEmbed({
	description: `${message.author} slurped ${content || "a random dick"}!`,
	image: (await snekfetch.get("https://nekos.life/api/v2/img/bj")).body,
}))));

export const succ = slurp;
export const suck = slurp;

export const yandere = nsfw(Message.typing(async (message, content) =>
{
	const response = await snekfetch.get(`https://yande.re/post.json?tags=${cgi(content)}`);
	const array = response.body;
	return message.channel.send(array.length ? weeb(Random.pick(array)) : `No image found for \`${content}\` on https://yande.re/`);
}));

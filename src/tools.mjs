import pick from "../lib/pick.mjs";
import reactions from "../lib/react.mjs";

import emotes from "../data/emotes.json";
import manual from "../data/manual.json";

import Discord from "discord.js";
import Jimp from "jimp";
import snekfetch from "snekfetch";
import tinycolor from "tinycolor2";

import util from "util";

export const base64 = (message, content) =>
{
	const encode = (message, text) =>
	{
		const code = text
			? text.length > 1500 ? "The message is too long." : Buffer.from(text).toString("base64")
			: message.attachments.size ? "" : "_ _";

		const transform = (attachment, index) => snekfetch.get(attachment.url)
			.then(response => new Discord.Attachment(Buffer.from(response.body.toString("base64")), `${index}.txt`));

		return Promise.all(message.attachments.map(transform))
			.then(files => message.channel.send(code, { files }));
	};

	const decode = (message, code) =>
	{
		const text = `${message.author}: ${Buffer.from(code, "base64")}` || (message.attachments.size ? "" : "_ _");

		const transform = (attachment, index) => snekfetch.get(attachment.url)
			.then(response => new Discord.Attachment(Buffer.from(response.text, "base64"), `${index}.bin`));

		return Promise.all(message.attachments.map(transform))
			.then(files => message.channel.send(text, { files }));
	};

	const [, command, text] = /(\S*)\s*([^]*)/.exec(content);

	switch (command) {
		case "encode":
			return encode(message, text);
		case "decode":
			return decode(message, text);
		default:
			return message.channel.send(manual.base64);
	}
};

export const color = async (message, content) =>
{
	const rgba = ({ r, g, b, a }) => (Math.round(r) << 24 | Math.round(g) << 16 | Math.round(b) << 8 | Math.round(255 * a)) >>> 0;
	const color = new tinycolor(content);

	if (!color.isValid())
		return await message.channel.send(`${content} is not a color.`);

	const description = `**Hex:** ${color.getAlpha() == 1 ? color.toHexString() : color.toHex8String()}
**RGB:** ${color.toRgbString()}
**HSL:** ${color.toHslString()}`;

	const image = new Jimp(128, 128, rgba(color.toRgb()));
	const buffer = await util.promisify((...x) => image.getBuffer(...x))("image/png");

	return await message.channel.send(description, new Discord.Attachment(buffer, "color.png"));
};

export const colour = color;

export const keycaps = (message, content) =>
{
	if (!content)
		return message.channel.send("_ _");

	const capped = content.toUpperCase()
		.replace(/ /g, "\u2002")
		.replace(/[0-9*#]/g, "$&\u20E3")
		.replace(/[A-Z]/g, match => `${String.fromCodePoint(match.charCodeAt() + 0x1F1A5)}\xAD`);

	const error = "Your message is too long!  Discord allows at most 2000 characters in a message and keycapping roughly doubles the length.  Therefore, try to cut you message down to 1000 characters.";

	return message.channel.send(capped.length <= 2000 ? capped : error);
};

export const poll = (message, content) =>
{
	const code = (x, index) => String.fromCodePoint(0x1F1E6 + index);
	const prepend = array => (x, index) => `${array[index]} ${x}`;

	const implementation = async (first, ...rest) =>
	{
		if (rest.length) {
			const emotes = rest.map(code);
			return reactions(...emotes)(await message.channel.send([first, ...rest.map(prepend(emotes))]));
		}

		const array = first.split(/\s+\|\s+/, 20);

		if (array.length > 1) {
			const emotes = array.map(code);
			return reactions(...emotes)(await message.channel.send(array.map(prepend(emotes))));
		}

		await message.react(emotes.success);
		await message.react(emotes.failure);

		return message;
	};

	return implementation(...content.split("\n", 21));
};

export const react = (message, content) =>
{
	const process = async (target, ...emotes) =>
	{
		const errors = [];

		for (const s of emotes)
			await target.react(/<a?:\w*:(\d*)>|$/.exec(s)[1] || s).catch(() => errors.push(s));

		const output = errors.length ? `Failed to react ${errors.join(", ")}` : "All emojis were successfully reacted.";
		return await (await message.channel.send(output)).delete(5000 + 1000 * errors.length);
	}

	const implementation = (first, ...rest) =>
	{
		return /^\d+$/.test(first)
			? message.channel.fetchMessage(first).then(target => process(target, ...rest))
			: process(message, first, ...rest);
	};
	
	return content ? implementation(...content.split(/\s+/)) : message.channel.send("Please specify emojis to react.");
};

export const someone = message => message.channel.send(pick([...message.guild.members.values()]).user.tag);

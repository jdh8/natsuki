import * as Dataset from "../data/index.mjs";

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
		const text = `${Buffer.from(code, "base64")}` || (message.attachments.size ? "" : "_ _");

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
			return message.channel.send(Dataset.manual.base64);
	}
};

class Checkerboard extends Jimp
{
	constructor(width, height, bit, even, odd)
	{
		super(width, height);
		this.scan(0, 0, width, height, (x, y) => this.setPixelColor((x ^ y) & bit ? odd : even, x, y));
	}
}

export const color = async (message, content) =>
{
	const color = new tinycolor(content);

	if (!color.isValid())
		return await message.channel.send(`${content} is not a color.`);

	const description = `**Hex:** ${color.getAlpha() == 1 ? color.toHexString() : color.toHex8String()}
**RGB:** ${color.toRgbString()}
**HSL:** ${color.toHslString()}`;

	const { r, g, b, a } = color.toRgb();
	const rgba = Math.round(r) << 24 | Math.round(g) << 16 | Math.round(b) << 8 | Math.round(255 * a);

	const size = 128;
	const bit = 16;
	const image = new Checkerboard(size, size, bit, 0xFFFFFFFF, 0x36393EFF).composite(new Jimp(size, size, rgba >>> 0), 0, 0);
	const buffer = await util.promisify((...x) => image.rgba(false).getBuffer(...x))("image/png");

	return await message.channel.send(description, new Discord.Attachment(buffer, "color.png"));
};

export const colour = color;

export const echo = (message, content) =>
{
	const f = (match, name) => name && message.client.emojis.find("name", name) || match;
	const text = content.replace(/<a?:\w*:\d*>|:(\w*):/g, f);
	const big = /^(?:<a?:\w+:\d+>\s*)+$/.test(text);

	return message.channel.send(big ? text : `${message.author}: ${text}`);
};

export const emoji = (message, content) =>
{
	const { emojis } = message.client;

	const respond = (match, id, name) =>
	{
		const emoji = id ? emojis.get(id) : emojis.find("name", name || match);
		return emoji ? emoji.url : match ? `The custom emoji ${match} is not found.` : "Please specify a custom emoji.";
	}

	return message.channel.send(respond(.../<a?:\w+:(\d+)>|:(\w+):|\S*/.exec(content)));
};

export const emote = emoji;

export const emojis = message =>
	message.channel.send(`The list of emojis is on <#420885744077504532> on Natsuki's shelf, my support server.  Please check them out there.
https://discord.gg/VdHYvMC`);

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
	const react = code => async message =>
	{
		for (let c = 0x1F1E6; c < code; ++c)
			await message.react(String.fromCodePoint(c)).catch(() => {});
		return message;
	}

	const prepend = (string, index) => `${String.fromCodePoint(0x1F1E6 + index)} ${string}`;
	const lines = content.split("\n", 21);

	if (lines.length > 1) {
		const topic = lines.shift();
		return message.channel.send([topic, ...lines.map(prepend)]).then(react(0x1F1E6 + lines.length));
	}

	const options = content.split(/\s+\|\s+/, 20);

	if (options.length > 1)
		return message.channel.send(options.map(prepend)).then(react(0x1F1E6 + options.length));

	const yesno = async message =>
	{
		await message.react(Dataset.success).catch(() => {});
		await message.react(Dataset.failure).catch(() => {});
		return message;
	};

	return yesno(message);
};

export const react = (message, content) =>
{
	if (!content)
		return message.channel.send("Please specify id of the message and emojis to react.");

	const pattern = /\S+/g;
	const [ id ] = pattern.exec(content);

	const remainder = content.substr(pattern.lastIndex);
	let target;

	if (id <= -100)
		return message.channel.send("I can only trace back 100 messages, oof!");
	else if (id <= 0)
		target = message.channel.fetchMessages({ limit: 1 - id }).then(collection => collection.last());
	else if (/\D/.exec(id))
		return message.channel.send(`${id} is not a message id, which is a positive integer`);
	else
		target = message.channel.fetchMessage(id);

	return target.then(async target =>
	{
		const pattern = /<a?:\w*:(\d*)>|:(\w*):|\S+/g;
		const resolve = (match, id, name) => id || message.client.emojis.find("name", name || match) || match;
		const errors = [];
		let match;

		while (match = pattern.exec(remainder))
			await target.react(resolve(...match)).catch(() => errors.push(match[0]));

		switch (errors.length) {
			case 0:
				return message.react(Dataset.success);
			case 1:
				return message.channel.send(`Emoji ${errors[0]} was not found.`);
			case 2:
				return message.channel.send(`Emojis ${errors[0]} and ${errors[1]} were not found.`);
			default:
				const last = errors.pop();
				return message.channel.send(`Emojis ${errors.join(", ")}, and ${last} were not found.`);
		}
	}).catch(() => message.channel.send(`The message with id ${id} was not found.`));
};

export const say = echo;

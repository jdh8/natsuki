import { MessageAttachment } from "discord.js";
import fetch from "node-fetch";

export const encode = (message, text) =>
{
	const code = text
		? text.length > 1500 ? "The message is too long." : Buffer.from(text).toString("base64")
		: message.attachments.size ? "" : "_ _";

	const transform = async (attachment, index) => new MessageAttachment(
		Buffer.from((await (await fetch(attachment.url)).buffer()).toString("base64")),
		`${index}.txt`);

	return Promise.all(message.attachments.map(transform))
		.then(files => message.reply({ content: code, files }));
};

export const decode = (message, code) =>
{
	const text = `${Buffer.from(code, "base64")}` || (message.attachments.size ? "" : "_ _");

	const transform = async (attachment, index) => new MessageAttachment(
		Buffer.from(await (await fetch(attachment.url)).text(), "base64"),
		`${index}.bin`);

	return Promise.all(message.attachments.map(transform))
		.then(files => message.reply({ content: text, files }));
};

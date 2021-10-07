import { MessageAttachment } from "discord.js";
import fetch from "node-fetch";

export const encode = (action, text) =>
{
	const code = text
		? text.length > 1500 ? "The message is too long." : Buffer.from(text).toString("base64")
		: action.attachments.size ? "" : "_ _";

	const transform = async (attachment, index) => new MessageAttachment(
		Buffer.from((await (await fetch(attachment.url)).buffer()).toString("base64")),
		`${index}.txt`);

	return Promise.all(action.attachments.map(transform))
		.then(files => action.reply({ content: code, files }));
};

export const decode = (action, code) =>
{
	const text = `${Buffer.from(code, "base64")}` || (action.attachments.size ? "" : "_ _");

	const transform = async (attachment, index) => new MessageAttachment(
		Buffer.from(await (await fetch(attachment.url)).text(), "base64"),
		`${index}.bin`);

	return Promise.all(action.attachments.map(transform))
		.then(files => action.reply({ content: text, files }));
};

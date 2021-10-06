import crypto from "crypto";

export const rate = (message, content) =>
{
	const data = content ? content.toLowerCase().replace(/<@!(\d+)>/g, "<@$1>") : `${message.member || message.author}`;
	const hash = new Uint32Array(crypto.createHash("md5").update(data).digest().buffer);
	const percentage = ((hash[0] + 25) >>> 0) % 101;

	return message.reply(`<:natsuki:424991419329937428> I'd give ${content || message.member || message.author} ${percentage}%.`);
};

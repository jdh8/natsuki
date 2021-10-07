import crypto from "crypto";

export const rate = (action, option) =>
{
	const arg = option?.value ?? option;
	const author = action.member ?? action.author;
	const data = arg ? arg.toLowerCase().replace(/<@!(\d+)>/g, "<@$1>") : `${author}`;
	const hash = new Uint32Array(crypto.createHash("md5").update(data).digest().buffer);
	const percentage = ((hash[0] + 25) >>> 0) % 101;

	return action.reply(`<:natsuki:424991419329937428> I'd give ${arg || author} ${percentage}%.`);
};

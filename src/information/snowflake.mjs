export const snowflake = (message, content) =>
{
	const match = /\d+/.exec(content);

	if (match == null)
		return message.reply("No valid snowfake is found.");

	const flake = BigInt(match[0]);
	const time = Number(flake >> 22n) + 1420070400000;
	const id = ~~Number(BigInt.asUintN(22, flake));

	return message.reply(`**Date:** ${new Date(time).toISOString()}
**Worker:** ${id >> 17}
**Process:** ${id >> 12 & 31}
**Increment:** ${id & 0xFFF}`);
};

export const snowflake = (action, option) =>
{
	const match = /\d+/.exec(option.value ?? option);

	if (match == null)
		return action.reply("No valid snowfake is found.");

	const flake = BigInt(match[0]);
	const time = Number(flake >> 22n) + 1420070400000;
	const id = ~~Number(BigInt.asUintN(22, flake));

	return action.reply(`**Date:** ${ new Date(time).toISOString() }
**Worker:** ${ id >> 17 }
**Process:** ${ id >> 12 & 31 }
**Increment:** ${ id & 0xFFF }`);
};

export const Snowflake = snowflake;

export const react = (message, content) =>
{
	const process = async (target, ...emoji) =>
	{
		const errors = [];

		for (const s of emoji)
			await target.react(/<(a?:\w*:\d*)>|$/.exec(s)[1] || s).catch(() => errors.push(s));

		const output = errors.length ? `Failed to react ${errors.join(", ")}` : "All emoji were successfully reacted.";
		return await (await message.reply(output)).delete({ timeout: 5000 + 1000 * errors.length });
	}

	const implementation = (first, ...rest) =>
	{
		return /^\d+$/.test(first)
			? message.channel.messages.fetch(first).then(target => process(target, ...rest))
			: process(message, first, ...rest);
	};
	
	return content ? implementation(...content.split(/\s+/)) : message.reply("Please specify emoji to react.");
};

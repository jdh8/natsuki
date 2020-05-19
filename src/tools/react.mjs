export const react = (message, content) =>
{
	const process = async (target, ...emotes) =>
	{
		const errors = [];

		for (const s of emotes)
			await target.react(/<(a?:\w*:\d*)>|$/.exec(s)[1] || s).catch(() => errors.push(s));

		const output = errors.length ? `Failed to react ${errors.join(", ")}` : "All emojis were successfully reacted.";
		return await (await message.channel.send(output)).delete({ timeout: 5000 + 1000 * errors.length });
	}

	const implementation = (first, ...rest) =>
	{
		return /^\d+$/.test(first)
			? message.channel.messages.fetch(first).then(target => process(target, ...rest))
			: process(message, first, ...rest);
	};
	
	return content ? implementation(...content.split(/\s+/)) : message.channel.send("Please specify emojis to react.");
};

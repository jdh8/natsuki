export const react = (action, option) =>
{
	const process = async (target, ...emoji) =>
	{
		const errors = [];

		for (const s of emoji)
			await target.react(/<(a?:\w*:\d*)>|$/.exec(s)[1] || s).catch(() => errors.push(s));

		const output = errors.length ? `Failed to react ${errors.join(", ")}` : "All emoji were successfully reacted.";
		return await (await action.reply(output)).delete({ timeout: 5000 + 1000 * errors.length });
	}

	const implementation = (first, ...rest) =>
	{
		return /^\d+$/.test(first)
			? action.channel.messages.fetch(first).then(target => process(target, ...rest))
			: process(action, first, ...rest);
	};
	
	const value = option.value ?? option;
	return value ? implementation(...value.split(/\s+/)) : action.reply("Please specify emoji to react.");
};

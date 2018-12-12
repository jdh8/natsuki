export const react = (...emotes) => async message =>
{
	for (let x of emotes)
		await message.react(x);

	return message;
}

export const typing = f => async (message, ...rest) =>
{
	message.channel.startTyping();

	try {
		return await f(message, ...rest);
	}
	finally {
		message.channel.stopTyping();
	}
};

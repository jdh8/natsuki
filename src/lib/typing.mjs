export default f => async (message, ...rest) =>
{
	message.channel.startTyping();

	try {
		return await f(message, ...rest);
	}
	finally {
		message.channel.stopTyping();
	}
};

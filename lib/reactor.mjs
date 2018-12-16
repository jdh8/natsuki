export default iterable => async message =>
{
	for (const emote of iterable)
		await message.react(emote);

	return message;
};

export default (...emotes) => async message =>
{
	for (let x of emotes)
		await message.react(x);

	return message;
}

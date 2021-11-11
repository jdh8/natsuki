const sleep = duration => new Promise(resolve => setTimeout(resolve, duration));

export const cute = async action =>
{
	action.channel.sendTyping();
	let content = "Don't say this embarassing thing, dummy!";
	const message = await action.reply({ content, fetchReply: true });

	action.channel.sendTyping();

	await sleep(3000);
	await message.edit(content += "\nY-You t-too....");
	await sleep(2000);
	await message.edit(content += "\nI'M NOT CUUUUUUUUUUUTE!");
	await sleep(2000);
	await message.edit(content += "\nDon't think you can make me say this embarassing thing just because we're not at school!");
	await sleep(4000);

	return message.edit(content += "\nI-I have to go to the bathroom.");
};

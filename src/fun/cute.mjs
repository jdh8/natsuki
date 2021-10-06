const sleep = duration => new Promise(resolve => setTimeout(resolve, duration));

export const cute = async message =>
{
	message.channel.sendTyping();
	let content = "Don't say this embarassing thing, dummy!";
	const reply = await message.reply(content);

	message.channel.sendTyping();
	await sleep(3000);
	await reply.edit(content += "\nY-You t-too....");
	await sleep(2000);
	await reply.edit(content += "\nI'M NOT CUUUUUUUUUUUTE!");
	await sleep(2000);
	await reply.edit(content += "\nDon't think you can make me say this embarassing thing just because we're not at school!");
	await sleep(4000);
	await reply.edit(content += "\nI-I have to go to the bathroom.");

	return message;
};

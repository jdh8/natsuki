export const shelf = (message, content) =>
{
	const user = message.client.users.cache.get(/\d+|$/.exec(content)[0]) || message.member || message.author;
	return message.reply(`**Fucking ${user}${user.username[0].repeat(5 + 10 * Math.random())}**`);
};

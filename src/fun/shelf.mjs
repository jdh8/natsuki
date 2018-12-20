export const shelf = (message, content) =>
{
	const user = message.client.users.get(/\d+|$/.exec(content)[0]) || message.author;
	return message.channel.send(`**Fucking ${user}${user.username[0].repeat(5 + 10 * Math.random())}**`);
};

export const shelf = (action, content) =>
{
	const user = action.client.users.cache.get(/\d+|$/.exec(content)[0]) || action.member || action.author;
	return action.reply(`**Fucking ${user}${user.username[0].repeat(5 + 10 * Math.random())}**`);
};

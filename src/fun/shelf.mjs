export const shelf = (action, option = { user: action.member }) =>
{
	const user = option.user ?? action.client.users.resolve(/\d+|$/.exec(option)[0]) ?? action.author;
	return action.reply(`**Fucking ${ user }${ user.username[0].repeat(5 + 10 * Math.random()) }**`);
};

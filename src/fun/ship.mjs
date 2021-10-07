export const ship = (action, content) =>
{
	const string = content.replace(/\s+&\s+/g, " × ");

	return action.reply(`Look at them, a lovey dovey couple!  I ship it!
${/\s+×\s/.test(string) ? string : `${action.member || action.author} × ${string || action.client.user}`}
N-not that I c-care...`)
};

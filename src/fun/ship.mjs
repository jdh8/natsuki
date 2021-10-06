export const ship = (message, content) =>
{
	const string = content.replace(/\s+&\s+/g, " × ");

	return message.reply(`Look at them, a lovey dovey couple!  I ship it!
${/\s+×\s/.test(string) ? string : `${message.member || message.author} × ${string || message.client.user}`}
N-not that I c-care...`)
};

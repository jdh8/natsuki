export const ship = (message, content) =>
{
	const string = content.replace(/\s+&\s+/g, " × ");

	return message.channel.send(`Look at them, a lovey dovey couple!  I ship it!
${/\s+×\s/.test(string) ? string : `${message.author} × ${string || message.client.user}`}
N-not that I c-care...`)
};

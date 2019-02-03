export const ping = message =>
{
	const format = (seconds, nano) => seconds ? `${(seconds + 1e-9 * nano).toFixed(3)} s` : `${(1e-6 * nano).toFixed()} ms`;
	const tick = process.hrtime();

	return message.channel.send("Pong!").then(message => message.edit(`${message.content} ${format(...process.hrtime(tick))}`));
};

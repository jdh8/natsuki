export const ping = action =>
{
	const format = (seconds, nano) => seconds ? `${(seconds + 1e-9 * nano).toFixed(3)} s` : `${(1e-6 * nano).toFixed()} ms`;
	const tick = process.hrtime();

	return action.reply({ content: "Pong!", fetchReply: true })
		.then(message => message.edit(`${message.content} ${format(...process.hrtime(tick))}`));
};

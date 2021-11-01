export const ping = async action =>
{
	const format = nano => nano >= 1e9 ? `${ (1e-9 * nano).toFixed(3) } s` : `${ (1e-6 * nano).toFixed() } ms`;
	const content = "Pong!";
	const tick = process.hrtime.bigint();
	const message = await action.reply({ content, fetchReply: true });
	return message.edit(`${ content } ${ format(Number(process.hrtime.bigint() - tick)) }`);
};

export default f => (action, ...args) =>
	action.channel.nsfw ? f(action, ...args) : action.reply({
		content: "🔞 This command only works in NSFW channels!",
		ephemeral: true,
	});

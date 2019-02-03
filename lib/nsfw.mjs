export default f => (message, ...rest) =>
	message.channel.nsfw ? f(message, ...rest) : message.channel.send("🔞 This command only works in NSFW channels!");

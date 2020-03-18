export const avatar = (message, content) =>
	message.channel.send((message.client.users.cache.get(/\d+|$/.exec(content)[0]) || message.author)
		.displayAvatarURL({ dynamic: true, size: 2048 }));

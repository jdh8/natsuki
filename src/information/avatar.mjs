export const avatar = (message, content) =>
	message.reply((message.client.users.cache.get(/\d+|$/.exec(content)[0]) || message.member || message.author)
		.displayAvatarURL({ dynamic: true, size: 2048 }));

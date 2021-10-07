export const avatar = (action, content) =>
	action.reply((action.client.users.cache.get(/\d+|$/.exec(content)[0]) || action.member || action.author)
		.displayAvatarURL({ dynamic: true, size: 2048 }));

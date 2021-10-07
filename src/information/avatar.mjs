export const avatar = (action, option = { user: action.member }) =>
	action.reply((option.user ?? action.client.users.cache.get(/\d+|$/.exec(option)[0]) ?? action.author)
		.displayAvatarURL({ dynamic: true, size: 2048 }));

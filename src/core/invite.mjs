export const invite = action =>
	action.reply(`https://discordapp.com/oauth2/authorize?&client_id=${action.client.user.id}&scope=bot`);

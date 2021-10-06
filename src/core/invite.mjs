export const invite = message =>
	message.reply(`https://discordapp.com/oauth2/authorize?&client_id=${message.client.user.id}&scope=bot`);

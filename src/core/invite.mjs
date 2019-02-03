export const invite = message =>
	message.channel.send(`https://discordapp.com/oauth2/authorize?&client_id=${message.client.user.id}&scope=bot`);

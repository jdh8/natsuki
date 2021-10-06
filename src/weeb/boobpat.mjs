export const boobpat = async (message, content) =>
{
	message.channel.sendTyping();

	return await message.reply({ embeds: [{
		description: `${message.member || message.author} patted ${content ? `${content} on the` : "some"} boobs!`,
		image: { url: "https://cdn.discordapp.com/attachments/403299886352695297/472762872209080321/image.gif" },
	}]});
};

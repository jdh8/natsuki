export const boobpat = async (action, content) =>
{
	action.channel.sendTyping();

	return await action.reply({ embeds: [{
		description: `${action.member || action.author} patted ${content ? `${content} on the` : "some"} boobs!`,
		image: { url: "https://cdn.discordapp.com/attachments/403299886352695297/472762872209080321/image.gif" },
	}]});
};

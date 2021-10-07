export const buttpat = async (action, content) =>
{
	action.channel.sendTyping();

	return await action.reply({ embeds: [{
		description: `${action.member || action.author} patted ${content || "Yuzu"} on the butts!`,
		image: { url: "https://78.media.tumblr.com/165f23ece178a17968de50f084a9ecec/tumblr_p25cyprR041vptudso2_400.gif" },
	}]});
};

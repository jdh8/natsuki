export const buttpat = async (message, content) =>
{
	message.channel.sendTyping();

	return await message.reply({ embeds: [{
		description: `${message.author} patted ${content || "Yuzu"} on the butts!`,
		image: { url: "https://78.media.tumblr.com/165f23ece178a17968de50f084a9ecec/tumblr_p25cyprR041vptudso2_400.gif" },
	}]});
};

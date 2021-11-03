export const buttpat = (action, option) =>
{
	action.channel.sendTyping();

	return action.reply({ embeds: [{
		description: `${ action.member ?? action.author } patted ${ (option?.value ?? option) || "Yuzu" } on the butts!`,
		image: { url: "https://78.media.tumblr.com/165f23ece178a17968de50f084a9ecec/tumblr_p25cyprR041vptudso2_400.gif" },
	}]});
};

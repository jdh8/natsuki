export const boobpat = (action, option) =>
{
	const value = option?.value ?? option;

	action.channel.sendTyping();

	return action.reply({ embeds: [{
		description: `${ action.member ?? action.author } patted ${ value ? `${ value } on the` : "some" } boobs!`,
		image: { url: "https://cdn.discordapp.com/attachments/403299886352695297/472762872209080321/image.gif" },
	}]});
};

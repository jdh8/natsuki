export const smash = (action, option) =>
{
	const value = option?.value ?? option;

	return action.reply({ embeds: [{
		description: `${ action.member ?? action.author } smashed${ value && " " }${ value }!`,
		image: { url: "https://raw.githubusercontent.com/jdh8/natsuki/master/assets/smash.png" },
	}]})
};

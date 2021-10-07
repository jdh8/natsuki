export const lick = (action, content) => action.reply({ embeds: [{
	description: `${action.member || action.author} licked ${content || "the air"}!`,
	image: { url: "https://cdn.discordapp.com/attachments/421196261132075009/421920949277818891/LickTemplate.gif" },
}]});

export const licc = lick;

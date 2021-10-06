export const lick = (message, content) => message.reply({ embeds: [{
	description: `${message.member || message.author} licked ${content || "the air"}!`,
	image: { url: "https://cdn.discordapp.com/attachments/421196261132075009/421920949277818891/LickTemplate.gif" },
}]});

export const licc = lick;

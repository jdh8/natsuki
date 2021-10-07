export const smash = (action, content) => action.reply({ embeds: [{
	description: `${action.member || action.author} smashed${content && " "}${content}!`,
	image: { url: "https://raw.githubusercontent.com/jdh8/natsuki/master/assets/smash.png" },
}]});

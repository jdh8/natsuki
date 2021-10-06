export const smash = (message, content) => message.reply({ embeds: [{
	description: `${message.author} smashed${content && " "}${content}!`,
	image: { url: "https://raw.githubusercontent.com/jdh8/natsuki/master/assets/smash.png" },
}]});

import manual from "../data/manual.json";

export const help = (message, content) =>
{
	const command = /\S*/.exec(content);
	return message.channel.send(manual[command] || `The command \`${command}\` is not found.`);
};

export const git = message => message.channel.send("https://github.com/jdh8/natsuki");

export const hanako = message => message.channel.send(`Meet Hanako Ikezawa, the best grill from Katawa Shoujo!
https://discordapp.com/oauth2/authorize?client_id=414384608076103680&scope=bot&permissions=66186303`);

export const invite = message =>
	message.channel.send(`https://discordapp.com/oauth2/authorize?&client_id=${message.client.user.id}&scope=bot`);

export const ping = message =>
{
	const format = (seconds, nano) => seconds ? `${(seconds + 1e-9 * nano).toFixed(3)} s` : `${(1e-6 * nano).toFixed()} ms`;
	const tick = process.hrtime();

	return message.channel.send("Pong!").then(message => message.edit(`${message.content} ${format(...process.hrtime(tick))}`));
};

export const repo = git;
export const source = git;

export const support = message => message.channel.send("https://discord.gg/VdHYvMC");

export const vote = message => message.channel.send(`https://discordbots.org/bot/${message.client.user.id}`);

export const yuri = message => message.channel.send(`Meet my best friend, Yuri!  ~~I love her although she has big boobs.~~
https://discordbots.org/bot/407652636054257665`);

import { Message } from "discord.js";

const consider = (x, index) => `${ String.fromCodePoint(0x1F1E6 + index) } ${ x }`;

const react = async (interaction, { value: stem }, ...options) =>
{
	const choices = options.map(x => consider(x.value, x.name.charCodeAt() - 0x61));
	const reply = await interaction.reply({ content: [stem, ...choices].join("\n"), fetchReply: true });

	if (choices.length) {
		for (const choice of choices)
			await reply.react(String.fromCodePoint(choice.codePointAt()));
	}
	else {
		await reply.react("✅");
		await reply.react("❌");
	}
	return reply;
}

const respond = async (message, content) =>
{
	const [first, ...rest] = content.split("\n", 21);

	if (rest.length) {
		const choices = rest.map(consider);
		const reply = await message.reply({ content: [first, ...choices].join("\n"), fetchReply: true });

		for (const choice of choices)
			await reply.react(String.fromCodePoint(choice.codePointAt()));

		return reply;
	}

	const array = first.split(/\s+\|\s+/, 20);

	if (array.length > 1) {
		const choices = array.map(consider);
		const reply = await message.reply({ content: choices.join("\n"), fetchReply: true });

		for (const choice of choices)
			await reply.react(String.fromCodePoint(choice.codePointAt()));

		return reply;
	}

	await message.react("✅");
	await message.react("❌");
	return message;
};

export const poll = (action, ...args) => (action instanceof Message ? respond : react)(action, ...args);

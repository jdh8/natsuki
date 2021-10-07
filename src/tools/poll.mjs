import { Message } from "discord.js";

const consider = (x, index) => `${String.fromCodePoint(0x1F1E6 + index)} ${x}`;

export const poll = async (action, first, ...rest) =>
{
	if (action instanceof Message)
		[first, ...rest] = first.split("\n", 21);

	if (rest.length) {
		const choices = rest.map(consider);
		const question = await action.reply({ content: [first, ...choices].join("\n"), fetchReply: true });

		for (const choice of choices)
			await question.react(String.fromCodePoint(choice.codePointAt()));

		return question;
	}

	const array = first.split(/\s+\|\s+/, 20);

	if (array.length > 1) {
		const choices = array.map(consider);
		const question = await action.reply({ content: choices.join("\n"), fetchReply: true });

		for (const choice of choices)
			await question.react(String.fromCodePoint(choice.codePointAt()));

		return question;
	}

	const message = action instanceof Message ? action : await action.reply({ content: first, fetchReply: true });
	await message.react("✅");
	await message.react("❌");
	return message;
};

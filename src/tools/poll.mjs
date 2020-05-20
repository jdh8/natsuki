const consider = (x, index) => `${String.fromCodePoint(0x1F1E6 + index)} ${x}`;

export const poll = async (message, content) =>
{
	const [first, ...rest] = content.split("\n", 21);

	if (rest.length) {
		const choices = rest.map(consider);
		const question = await message.channel.send([first, ...choices]);

		for (const choice of choices)
			await question.react(String.fromCodePoint(choice.codePointAt()));

		return question;
	}

	const array = first.split(/\s+\|\s+/, 20);

	if (array.length > 1) {
		const choices = array.map(consider);
		const question = await message.channel.send(choices);

		for (const choice of choices)
			await question.react(String.fromCodePoint(choice.codePointAt()));

		return question;
	}

	await message.react("✅");
	await message.react("❌");
	return message;
};

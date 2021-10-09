import manual from "../../data/manual.json";

export const help = (action, option = { value: "" }) =>
{
	const command = option.value ?? /\S*/.exec(option);
	const text = manual[command];

	return action.reply({
		content: text ?? `The command \`${ command }\` is not found.`,
		ephemeral: text == null,
	});
};

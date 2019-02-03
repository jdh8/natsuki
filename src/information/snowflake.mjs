import Discord from "discord.js";

export const snowflake = (message, content) =>
{
	const match = /\d+/.exec(content);

	if (match == null)
		return message.channel.send("No valid snowfake is found.");

	const deconstructed = Discord.SnowflakeUtil.deconstruct(match[0]);

	return message.channel.send(`**Date:** ${deconstructed.date.toISOString()}
**Worker:** ${deconstructed.workerID}
**Process:** ${deconstructed.processID}
**Increment:** ${deconstructed.increment}`);
};

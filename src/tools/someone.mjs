import sample from "../lib/sample.mjs";

export const someone = message => message.reply(sample([...message.guild.members.cache.values()]).user.tag);

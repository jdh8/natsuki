import sample from "../lib/sample.mjs";

export const someone = message => message.channel.send(sample([...message.guild.members.cache.values()]).user.tag);

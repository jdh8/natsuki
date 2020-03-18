import pick from "../lib/pick.mjs";

export const someone = message => message.channel.send(pick([...message.guild.members.cache.values()]).user.tag);

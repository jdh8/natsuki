import sample from "../lib/sample.mjs";

export const someone = action => action.reply(sample([...action.channel.members.values()]).user.tag);

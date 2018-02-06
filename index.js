"use strict";

function Natsuki()
{
	const Discord = require("discord.io");
	const conf = require("./auth.json");

	conf.autorun = true;

	return new Discord.Client(conf);
}

const natsuki = Natsuki();

natsuki.on("message", function(username, user, channel, message)
{
	const mention = "<@" + user + ">";
	
	if (message == "n.ping") {
		this.sendMessage({
			to: channel,
			message: mention + ": pong!"
		});
	}
});

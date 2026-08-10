Privacy Policy
==============
Natsuki keeps no database.  Most commands are answered on the fly and leave
no trace.

The chat feature (`/chat` or @mentioning Natsuki) works differently:

* Your message (and your Discord username) is sent to a language model to
  generate Natsuki's reply.  The instance you invited from this repository's
  README uses [Groq](https://groq.com/), subject to
  [Groq's privacy policy](https://groq.com/privacy-policy/).  Anyone
  self-hosting Natsuki can point `CHAT_URL` at their own server, in which case
  messages go there instead and never reach Groq.
* The last ~10 exchanges per channel are kept in memory so Natsuki can follow
  the conversation.  This history is never written to disk and is erased
  whenever the bot restarts.

Privacy Policy
==============
Natsuki keeps no database.  Most commands are answered on the fly and leave
no trace.

The chat feature (`/chat` or @mentioning Natsuki) works differently:

* Your message (and your Discord username) is sent to [Groq](https://groq.com/)
  to generate Natsuki's reply, subject to
  [Groq's privacy policy](https://groq.com/privacy-policy/).
* The last ~10 exchanges per channel are kept in memory so Natsuki can follow
  the conversation.  This history is never written to disk and is erased
  whenever the bot restarts.
